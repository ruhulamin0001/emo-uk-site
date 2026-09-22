import { normalisePhone, extractPostcode, domainOf, leadId, isInArea, log } from './util.mjs';

function isChain(name, config) {
  const n = (name || '').toLowerCase();
  return config.exclude.chains.some((c) => n.includes(c));
}

function guessTown(lead, config) {
  if (lead.town) return lead.town;
  const hay = `${lead.address || ''}`.toLowerCase();
  return config.area.towns.find((t) => hay.includes(t.toLowerCase())) || null;
}

/** Merge two records for the same business, preferring richer data. */
function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === null || v === undefined || v === '') continue;
    if (out[k] === null || out[k] === undefined || out[k] === '') out[k] = v;
  }
  out.sources = [...new Set([...(a.sources || [a.source]), ...(b.sources || [b.source])])].filter(Boolean);
  // Google's rating data always wins over anything scraped elsewhere.
  if (b.source === 'google-places') {
    if (b.rating != null) out.rating = b.rating;
    if (b.reviewCount != null) out.reviewCount = b.reviewCount;
    if (b.mapsUrl) out.mapsUrl = b.mapsUrl;
  }
  return out;
}

export function normalise(rawLeads, config) {
  const byId = new Map();
  const byPhone = new Map();
  const stats = { input: rawLeads.length, chains: 0, closed: 0, outOfArea: 0, merged: 0 };

  for (const raw of rawLeads) {
    if (!raw.name) continue;

    if (isChain(raw.name, config)) {
      stats.chains++;
      continue;
    }
    if (config.exclude.excludeIfPermanentlyClosed && raw.businessStatus && raw.businessStatus !== 'OPERATIONAL') {
      stats.closed++;
      continue;
    }

    const phone = normalisePhone(raw.phone);
    const postcode = raw.postcode || extractPostcode(raw.address || '');
    const inArea = isInArea(postcode, config.area.outwardCodePrefixes);
    if (inArea === false) {
      stats.outOfArea++;
      continue;
    }

    const lead = {
      name: String(raw.name).trim(),
      category: raw.category,
      source: raw.source,
      sources: [raw.source],
      sourceId: raw.sourceId || null,
      sourceNote: raw.sourceNote || null,
      address: raw.address || null,
      postcode,
      town: guessTown({ ...raw, postcode }, config),
      phoneE164: phone?.e164 || null,
      phoneNational: phone?.national || null,
      phoneType: phone?.type || null,
      phoneVerified: raw.phoneVerified === true,
      email: raw.email || null,
      website: raw.website || null,
      domain: domainOf(raw.website),
      rating: raw.rating ?? null,
      reviewCount: raw.reviewCount ?? null,
      openingHours: raw.openingHours || null,
      mapsUrl: raw.mapsUrl || null,
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      inArea,
    };
    lead.id = leadId(lead);

    // Dedupe on id, then on phone number (same shop, two listings).
    const existingId = byId.get(lead.id);
    if (existingId) {
      byId.set(lead.id, merge(existingId, lead));
      stats.merged++;
      continue;
    }
    if (lead.phoneE164 && byPhone.has(lead.phoneE164)) {
      const other = byPhone.get(lead.phoneE164);
      byId.set(other.id, merge(byId.get(other.id), lead));
      stats.merged++;
      continue;
    }
    byId.set(lead.id, lead);
    if (lead.phoneE164) byPhone.set(lead.phoneE164, lead);
  }

  const leads = [...byId.values()];
  log(
    `normalise: ${stats.input} in → ${leads.length} unique ` +
      `(chains removed ${stats.chains}, closed ${stats.closed}, out of area ${stats.outOfArea}, merged ${stats.merged})`
  );
  return { leads, stats };
}
