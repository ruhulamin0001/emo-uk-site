/**
 * OpenStreetMap Overpass API — free, no API key, ODbL licensed.
 * Good breadth for garages and bike workshops, weaker on phone numbers
 * than Google. Use it as a no-cost baseline or to cross-check Places.
 */
import { fetchWithRetry, sleep, log } from '../util.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function buildQuery(config, tags) {
  const { bbox } = config.area;
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const clauses = tags
    .map((t) => {
      const [k, v] = t.split('=');
      return `  nwr["${k}"="${v}"](${box});`;
    })
    .join('\n');
  return `[out:json][timeout:90];\n(\n${clauses}\n);\nout center tags;`;
}

function mapElement(el, category) {
  const t = el.tags || {};
  const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city'] || t['addr:town'], t['addr:postcode']]
    .filter(Boolean)
    .join(', ');
  return {
    source: 'overpass',
    sourceId: `${el.type}/${el.id}`,
    name: t.name || null,
    category,
    address: addr || null,
    postcode: t['addr:postcode'] || null,
    town: t['addr:city'] || t['addr:town'] || null,
    phone: t.phone || t['contact:phone'] || null,
    website: t.website || t['contact:website'] || null,
    email: t.email || t['contact:email'] || null,
    openingHours: t.opening_hours ? [t.opening_hours] : null,
    lat: el.lat ?? el.center?.lat ?? null,
    lng: el.lon ?? el.center?.lon ?? null,
    osmTags: t,
  };
}

export async function collect(config, { limit = Infinity } = {}) {
  const out = [];
  for (const cat of config.categories) {
    const query = buildQuery(config, cat.overpassTags);
    let data = null;
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetchWithRetry(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query),
          },
          { timeoutMs: 100000, retries: 1 }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        break;
      } catch (err) {
        log(`overpass: ${endpoint} failed (${err.message}), trying next endpoint`);
      }
    }
    if (!data) {
      log(`overpass: all endpoints failed for ${cat.key} — skipping`);
      continue;
    }
    for (const el of data.elements || []) {
      if (!el.tags?.name) continue;
      if (out.length >= limit) return out;
      out.push(mapElement(el, cat.key));
    }
    log(`overpass: ${cat.key} → ${out.length} total`);
    await sleep(3000); // be a good citizen on a free shared endpoint
  }
  return out;
}
