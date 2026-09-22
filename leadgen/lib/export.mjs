import { toCSV, writeText, writeJSON, log } from './util.mjs';

const CSV_COLUMNS = [
  'id','tier','score','name','category','town','postcode','phoneNational','phoneE164','phoneVerified',
  'email','website','rating','reviewCount','hasOnlineBooking','bookingPlatform','gaps',
  'entityType','emailAllowed','callAllowed','contactStatus','mapsUrl','topReason',
];

function csvRow(lead) {
  const a = lead.enrichment?.analysis;
  return {
    id: lead.id,
    tier: lead.tier,
    score: lead.score,
    name: lead.name,
    category: lead.category,
    town: lead.town,
    postcode: lead.postcode,
    phoneNational: lead.phoneNational,
    phoneE164: lead.phoneE164,
    phoneVerified: lead.phoneVerified ? 'yes' : 'no',
    email: lead.email,
    website: lead.website,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    hasOnlineBooking: a ? (a.hasOnlineBooking ? 'yes' : 'no') : 'unknown',
    bookingPlatform: a?.bookingPlatform || '',
    gaps: lead.gaps || [],
    entityType: lead.contactPolicy?.entityType || '',
    emailAllowed: lead.contactPolicy?.emailAllowed ? 'yes' : 'no',
    callAllowed: lead.contactPolicy?.callAllowed ? 'yes' : 'no',
    contactStatus: lead.contactStatus || 'new',
    mapsUrl: lead.mapsUrl || '',
    topReason: lead.scoreReasons?.[0]?.reason || '',
  };
}

function briefing(leads, config) {
  const byTier = { A: [], B: [], C: [] };
  for (const l of leads) byTier[l.tier]?.push(l);

  const byTown = new Map();
  for (const l of [...byTier.A, ...byTier.B]) {
    const t = l.town || 'Unknown';
    if (!byTown.has(t)) byTown.set(t, []);
    byTown.get(t).push(l);
  }

  const lines = [];
  lines.push(`# ${config.campaign.name}`);
  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${leads.length} leads`);
  lines.push('');
  lines.push(`**Tier A (call first): ${byTier.A.length}** · Tier B: ${byTier.B.length} · Tier C: ${byTier.C.length}`);
  lines.push('');
  lines.push('> Screen every number against TPS/CTPS before dialling. Sole traders and partnerships: phone or post, not cold email.');
  lines.push('');

  lines.push('## This week — call these first');
  lines.push('');
  for (const lead of byTier.A.slice(0, 25)) {
    lines.push(`### ${lead.score} · ${lead.name} — ${lead.town || '?'}`);
    const contact = [
      lead.phoneNational ? `📞 ${lead.phoneNational}${lead.phoneVerified ? '' : ' (unverified)'}` : null,
      lead.email ? `✉️ ${lead.email}` : null,
      lead.website || null,
    ].filter(Boolean);
    if (contact.length) lines.push(contact.join(' · '));
    lines.push('');
    lines.push('Why they need it:');
    for (const r of (lead.scoreReasons || []).filter((r) => r.points > 0).slice(0, 4)) {
      lines.push(`- ${r.reason}`);
    }
    if (lead.reviewSignals?.quotes?.length) {
      lines.push('');
      lines.push(`Review quote to use on the call: _"${lead.reviewSignals.quotes[0]}"_`);
    }
    lines.push('');
    lines.push(`Contact route: ${lead.contactPolicy?.callAllowed ? 'call' : lead.contactPolicy?.callNote}${lead.contactPolicy?.emailAllowed ? ' / email OK' : ''}`);
    lines.push('');
  }

  lines.push('## Route plan — group your calls by town');
  lines.push('');
  for (const [town, list] of [...byTown.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- **${town}** (${list.length}): ${list.slice(0, 8).map((l) => `${l.name} [${l.score}]`).join(', ')}${list.length > 8 ? ' …' : ''}`);
  }
  lines.push('');

  const needsWork = leads.filter((l) => !l.phoneE164 && !l.email);
  if (needsWork.length) {
    lines.push('## Needs a manual lookup (no phone, no email yet)');
    lines.push('');
    for (const l of needsWork.slice(0, 30)) {
      lines.push(`- ${l.name}${l.town ? ` — ${l.town}` : ''}${l.website ? ` — ${l.website}` : ' — no website either'}`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

export function exportAll(leads, config) {
  const out = config.output;
  writeJSON(out.leadsFile, { generatedAt: new Date().toISOString(), campaign: config.campaign.id, count: leads.length, leads });
  writeText(out.csvFile, toCSV(leads.map(csvRow), CSV_COLUMNS));
  writeText(out.briefingFile, briefing(leads, config));
  log(`export: ${out.leadsFile}, ${out.csvFile}, ${out.briefingFile}`);
}
