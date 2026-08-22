/**
 * Google Places API (New) — the official, Terms-compliant way to read
 * Google Business Profile ("Google My Business") listings.
 *
 * Needs GOOGLE_PLACES_API_KEY in the environment. Enable "Places API (New)"
 * in Google Cloud and restrict the key to that API.
 *
 * Cost note: Text Search (Pro fields) is billed per request. A full
 * Hertfordshire sweep at ~2 queries x 31 towns x 2 categories is roughly
 * 120 requests, comfortably inside the monthly free allowance at the time of
 * writing — but check current pricing before scheduling it daily. Weekly is
 * plenty for this market.
 */
import { fetchWithRetry, sleep, log } from '../util.mjs';

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.primaryType',
  'places.regularOpeningHours',
  'places.location',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

async function searchPage(apiKey, body) {
  const res = await fetchWithRetry(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Places API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function mapPlace(p, category) {
  const hours = p.regularOpeningHours?.weekdayDescriptions || null;
  return {
    source: 'google-places',
    sourceId: p.id,
    name: p.displayName?.text || null,
    category,
    address: p.formattedAddress || null,
    phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    businessStatus: p.businessStatus || null,
    primaryType: p.primaryType || null,
    openingHours: hours,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    mapsUrl: p.googleMapsUri || null,
  };
}

export async function collect(config, { limit = Infinity } = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    log('google-places: GOOGLE_PLACES_API_KEY not set — skipping this source.');
    return [];
  }

  const { bbox } = config.area;
  const locationRestriction = {
    rectangle: {
      low: { latitude: bbox.south, longitude: bbox.west },
      high: { latitude: bbox.north, longitude: bbox.east },
    },
  };

  const out = [];
  const seen = new Set();

  for (const cat of config.categories) {
    for (const town of config.area.towns) {
      for (const q of cat.placesQueries) {
        if (out.length >= limit) return out;
        const textQuery = `${q} in ${town}, Hertfordshire, UK`;
        let pageToken;
        let page = 0;
        do {
          let data;
          try {
            data = await searchPage(apiKey, {
              textQuery,
              locationRestriction,
              includedType: cat.placesIncludedType || undefined,
              pageSize: 20,
              languageCode: 'en-GB',
              regionCode: 'GB',
              ...(pageToken ? { pageToken } : {}),
            });
          } catch (err) {
            log(`google-places: "${textQuery}" failed — ${err.message}`);
            break;
          }
          for (const p of data.places || []) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            out.push(mapPlace(p, cat.key));
          }
          pageToken = data.nextPageToken;
          page++;
          await sleep(400); // stay well under QPS limits
        } while (pageToken && page < 3);
        log(`google-places: ${textQuery} → running total ${out.length}`);
      }
    }
  }
  return out;
}

/**
 * Optional second pass: pull the review text for a place and look for the
 * single most persuasive signal in this whole campaign — customers saying
 * nobody picked up the phone.
 */
const MISSED_CALL_RE =
  /(no (?:one |body )?(?:answer|picked up)|couldn'?t get (?:through|hold)|never (?:called|got) back|rang (?:out|and rang)|left (?:several |a )?(?:message|voicemail)|phone (?:is )?(?:never|not) answered|impossible to (?:get through|reach)|unanswered)/i;

export async function collectReviews(leads, { limit = Infinity } = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    log('google-places reviews: GOOGLE_PLACES_API_KEY not set — skipping.');
    return leads;
  }
  let done = 0;
  for (const lead of leads) {
    if (done >= limit) break;
    const placeId = lead.sourceId && lead.sources?.includes('google-places') ? lead.sourceId : null;
    if (!placeId || lead.reviewSignals) continue;
    try {
      const res = await fetchWithRetry(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reviews = (data.reviews || []).map((r) => r.text?.text || r.originalText?.text || '').filter(Boolean);
      const hits = reviews.filter((t) => MISSED_CALL_RE.test(t));
      lead.reviewSignals = {
        sampled: reviews.length,
        missedCallMentions: hits.length,
        quotes: hits.slice(0, 2).map((t) => t.slice(0, 220)),
      };
      if (hits.length) log(`reviews: ${lead.name} — ${hits.length} missed-call mention(s)`);
    } catch (err) {
      log(`reviews: ${lead.name} failed — ${err.message}`);
      lead.reviewSignals = { sampled: 0, missedCallMentions: 0, quotes: [], error: err.message };
    }
    done++;
    await sleep(400);
  }
  return leads;
}
