#!/usr/bin/env node
/**
 * Hertfordshire car & bike mechanic lead pipeline.
 *
 *   node leadgen/run.mjs all                     # collect → enrich → score → outreach → export
 *   node leadgen/run.mjs collect --source=seed   # seed | places | overpass | all
 *   node leadgen/run.mjs enrich --limit=20 [--force]
 *   node leadgen/run.mjs reviews --limit=50      # needs GOOGLE_PLACES_API_KEY
 *   node leadgen/run.mjs score
 *   node leadgen/run.mjs outreach
 *   node leadgen/run.mjs export
 *   node leadgen/run.mjs stats
 *   node leadgen/run.mjs suppress --email=x@y.co.uk | --phone=+4417... | --domain=y.co.uk
 *   node leadgen/run.mjs import-status --file=statuses.json   # merge dashboard edits back
 *
 * State lives in leadgen/data/leads.json and is merged across runs, so a
 * weekly scheduled run adds new businesses without losing your call notes.
 */
import fs from 'node:fs';
import { readJSON, writeJSON, log, parseArgs } from './lib/util.mjs';
import { normalise } from './lib/normalise.mjs';
import { enrichAll } from './lib/enrich.mjs';
import { scoreAll } from './lib/score.mjs';
import { buildOutreach } from './lib/outreach.mjs';
import { exportAll } from './lib/export.mjs';
import * as seedSource from './lib/sources/seed.mjs';
import * as placesSource from './lib/sources/google-places.mjs';
import * as overpassSource from './lib/sources/overpass.mjs';

const CONFIG_FILE = process.env.LEADGEN_CONFIG || 'leadgen/config.json';

function loadConfig() {
  const config = readJSON(CONFIG_FILE);
  if (!config) {
    console.error(`Cannot read ${CONFIG_FILE}`);
    process.exit(1);
  }
  return config;
}

function loadState(config) {
  const state = readJSON(config.output.leadsFile, { leads: [] });
  return state.leads || [];
}

function saveState(config, leads) {
  writeJSON(config.output.leadsFile, {
    generatedAt: new Date().toISOString(),
    campaign: config.campaign.id,
    count: leads.length,
    leads,
  });
}

/** Keep everything a human added; take everything a machine discovered. */
const HUMAN_FIELDS = ['contactStatus', 'notes', 'ctpsCheckedAt', 'contactFirstName', 'lastContactedAt', 'nextActionAt', 'outcome'];

function mergeIntoState(existing, incoming) {
  const byId = new Map(existing.map((l) => [l.id, l]));
  let added = 0;
  for (const lead of incoming) {
    const prev = byId.get(lead.id);
    if (!prev) {
      lead.firstSeenAt = new Date().toISOString();
      lead.isNew = true;
      byId.set(lead.id, lead);
      added++;
      continue;
    }
    const kept = {};
    for (const f of HUMAN_FIELDS) if (prev[f] !== undefined) kept[f] = prev[f];
    byId.set(lead.id, {
      ...prev,
      ...lead,
      ...kept,
      enrichment: lead.enrichment || prev.enrichment,
      reviewSignals: lead.reviewSignals || prev.reviewSignals,
      firstSeenAt: prev.firstSeenAt || new Date().toISOString(),
      isNew: false,
    });
  }
  log(`merge: ${added} new, ${incoming.length - added} already known, ${byId.size} total`);
  return [...byId.values()];
}

async function cmdCollect(config, args) {
  const which = String(args.source || 'seed');
  const limit = args.limit ? Number(args.limit) : Infinity;
  const raw = [];

  if (which === 'seed' || which === 'all') raw.push(...(await seedSource.collect(config, {})));
  if (which === 'places' || which === 'all') raw.push(...(await placesSource.collect(config, { limit })));
  if (which === 'overpass' || which === 'all') raw.push(...(await overpassSource.collect(config, { limit })));

  if (!raw.length) {
    log('collect: nothing returned. Check --source and, for places, GOOGLE_PLACES_API_KEY.');
    return loadState(config);
  }

  const { leads } = normalise(raw, config);
  const merged = mergeIntoState(loadState(config), leads);
  saveState(config, merged);
  return merged;
}

async function cmdEnrich(config, args) {
  const leads = loadState(config);
  if (!leads.length) return log('enrich: no leads yet — run collect first.');
  const limit = args.limit ? Number(args.limit) : Infinity;
  await enrichAll(leads, config, { limit, force: Boolean(args.force) });
  saveState(config, leads);
  return leads;
}

async function cmdReviews(config, args) {
  const leads = loadState(config);
  await placesSource.collectReviews(leads, { limit: args.limit ? Number(args.limit) : Infinity });
  saveState(config, leads);
  return leads;
}

function cmdScore(config) {
  const leads = scoreAll(loadState(config), config);
  saveState(config, leads);
  const tiers = leads.reduce((acc, l) => ((acc[l.tier] = (acc[l.tier] || 0) + 1), acc), {});
  log(`score: A=${tiers.A || 0} B=${tiers.B || 0} C=${tiers.C || 0}`);
  return leads;
}

function cmdOutreach(config) {
  const leads = buildOutreach(loadState(config), config);
  saveState(config, leads);
  const ready = leads.filter((l) => l.outreach?.readyToEmail).length;
  const callable = leads.filter((l) => l.outreach?.readyToCall).length;
  log(`outreach: messages built for ${leads.length} leads — ${ready} email-ready, ${callable} call-ready`);
  return leads;
}

function cmdExport(config) {
  const leads = loadState(config);
  if (!leads.length) return log('export: nothing to export.');
  exportAll(leads, config);
}

function cmdStats(config) {
  const leads = loadState(config);
  if (!leads.length) return log('stats: no leads yet.');
  const by = (fn) => leads.reduce((a, l) => ((a[fn(l) ?? 'unknown'] = (a[fn(l) ?? 'unknown'] || 0) + 1), a), {});
  console.log('\nTotal leads:', leads.length);
  console.log('By tier:      ', by((l) => l.tier));
  console.log('By category:  ', by((l) => l.category));
  console.log('By status:    ', by((l) => l.contactStatus || 'new'));
  console.log('With phone:   ', leads.filter((l) => l.phoneE164).length);
  console.log('With email:   ', leads.filter((l) => l.email).length);
  console.log('Enriched:     ', leads.filter((l) => l.enrichment).length);
  console.log('No online booking:', leads.filter((l) => l.enrichment?.analysis && !l.enrichment.analysis.hasOnlineBooking).length);
  console.log('\nTop 10:');
  for (const l of leads.slice(0, 10)) {
    console.log(`  ${String(l.score).padStart(3)} [${l.tier}] ${l.name} — ${l.town || '?'} — ${l.phoneNational || l.email || 'no contact yet'}`);
  }
  console.log('');
}

function cmdSuppress(config, args) {
  const file = 'leadgen/data/suppression.json';
  const data = readJSON(file, { emails: [], phones: [], domains: [], names: [] });
  let changed = false;
  for (const [flag, key] of [['email', 'emails'], ['phone', 'phones'], ['domain', 'domains'], ['name', 'names']]) {
    if (typeof args[flag] === 'string') {
      data[key] = [...new Set([...(data[key] || []), args[flag]])];
      changed = true;
      log(`suppress: added ${flag} ${args[flag]}`);
    }
  }
  if (!changed) return log('suppress: pass --email=, --phone=, --domain= or --name=');
  writeJSON(file, data);

  // Mark any matching lead immediately so nothing goes out in the meantime.
  const leads = loadState(config);
  for (const l of leads) {
    if (
      (args.email && l.email === args.email) ||
      (args.phone && l.phoneE164 === args.phone) ||
      (args.domain && l.domain === args.domain) ||
      (args.name && l.name === args.name)
    ) {
      l.contactStatus = 'do-not-contact';
      l.outreach = { suppressed: 'suppression list' };
    }
  }
  saveState(config, leads);
}

function cmdImportStatus(config, args) {
  if (!args.file || !fs.existsSync(args.file)) return log('import-status: pass --file=path/to/statuses.json');
  const incoming = readJSON(args.file, {});
  const leads = loadState(config);
  let n = 0;
  for (const lead of leads) {
    const patch = incoming[lead.id];
    if (!patch) continue;
    for (const f of HUMAN_FIELDS) if (patch[f] !== undefined) lead[f] = patch[f];
    n++;
  }
  saveState(config, leads);
  log(`import-status: updated ${n} leads`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'all';
  const config = loadConfig();
  fs.mkdirSync(config.output.dir, { recursive: true });

  switch (cmd) {
    case 'collect': await cmdCollect(config, args); break;
    case 'enrich': await cmdEnrich(config, args); break;
    case 'reviews': await cmdReviews(config, args); break;
    case 'score': cmdScore(config); break;
    case 'outreach': cmdOutreach(config); break;
    case 'export': cmdExport(config); break;
    case 'stats': cmdStats(config); break;
    case 'suppress': cmdSuppress(config, args); break;
    case 'import-status': cmdImportStatus(config, args); break;
    case 'all':
      await cmdCollect(config, { ...args, source: args.source || 'all' });
      await cmdEnrich(config, args);
      if (process.env.GOOGLE_PLACES_API_KEY) await cmdReviews(config, args);
      cmdScore(config);
      cmdOutreach(config);
      cmdExport(config);
      cmdStats(config);
      break;
    default:
      console.error(`Unknown command "${cmd}". See the header of leadgen/run.mjs for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
