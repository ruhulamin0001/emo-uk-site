/**
 * Hand-verified starter list shipped with the repo, so the pipeline
 * produces something useful on day one with no API key at all.
 */
import { readJSON, log } from '../util.mjs';

export async function collect(_config, { seedFile = 'leadgen/data-seed/hertfordshire-seed.json' } = {}) {
  const data = readJSON(seedFile);
  if (!data) {
    log(`seed: ${seedFile} not found`);
    return [];
  }
  const out = data.leads.map((l) => ({
    source: 'web-search-seed',
    sourceId: null,
    name: l.name,
    category: l.category,
    address: l.address || null,
    postcode: l.postcode || null,
    town: l.town || null,
    phone: l.phone || null,
    phoneAlt: l.phoneAlt || null,
    phoneVerified: l.verified === true,
    website: l.website || null,
    sourceNote: l.note || null,
  }));
  log(`seed: ${out.length} leads`);
  return out;
}
