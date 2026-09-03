/**
 * Thikana niye kaj korar helper.
 *
 * Data ashe src/data/locations.ts theke - ota script e toiri hoy,
 * hate bodlaben na.
 */

import {
  areas,
  districts,
  divisions,
  type Area,
  type AreaTier,
  type District,
  type Division,
} from '@/data/locations';

export { areas, districts, divisions };
export type { Area, AreaTier, District, Division };

/* ── Khoja ───────────────────────────────────────────────── */

const districtById = new Map(districts.map((d) => [d.id, d]));
const areaById = new Map(areas.map((a) => [a.id, a]));
const divisionById = new Map(divisions.map((d) => [d.id, d]));

export const findDivision = (id: string) => divisionById.get(id);
export const findDistrict = (id: string) => districtById.get(id);
export const findArea = (id: string) => areaById.get(id);

/** Cascading dropdown er jonno - bibhag bachle jela gulo */
export function getDistricts(divisionId: string): District[] {
  return districts
    .filter((d) => d.divisionId === divisionId)
    .sort((a, b) => a.bn.localeCompare(b.bn, 'bn'));
}

/** Jela bachle elaka gulo */
export function getAreas(districtId: string): Area[] {
  return areas
    .filter((a) => a.districtId === districtId)
    .sort((a, b) => a.bn.localeCompare(b.bn, 'bn'));
}

/* ── Duita bhashay khoja ─────────────────────────────────── */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export interface AreaHit {
  area: Area;
  /** "মিরপুর, ঢাকা" - ei label i dekhate HOBE, sudhu area.bn na */
  label: string;
}

/**
 * `mirpur` likhleo hobe, `মিরপুর` likhleo hobe.
 *
 * 12 ta nam ekadhik jelay ache - Mirpur (Kushtia o Dhaka),
 * Mohammadpur (Magura o Dhaka), Bandar (Narayanganj o Chattogram)
 * ityadi. Tai `label` e SOB SOMOY jela thake. Sudhu `area.bn`
 * dekhale user bhul elaka bachbe.
 */
export function searchAreas(query: string, limit = 12): AreaHit[] {
  const q = norm(query);
  const qRaw = query.trim();
  if (q.length < 2) return [];

  /* Manush shohorer nam likhe - "rajshahi", "খুলনা". Kintu oi shohorer
     thana gulor nam Boalia, Rajpara... tai jelar nam o milate hobe,
     na hole shohorer nam likhle kichui ashe na. */
  const matchedDistricts = new Set(
    districts
      .filter((d) => norm(d.name).includes(q) || d.bn.includes(qRaw))
      .map((d) => d.id),
  );

  const hits: Array<{ area: Area; score: number }> = [];
  for (const a of areas) {
    const en = norm(a.name);
    const bn = a.bn;
    let score = -1;
    if (en === q || bn === qRaw) score = 0;
    else if (en.startsWith(q) || bn.startsWith(qRaw)) score = 1;
    else if (en.includes(q) || bn.includes(qRaw)) score = 2;
    else if (matchedDistricts.has(a.districtId)) score = 3;
    if (score >= 0) hits.push({ area: a, score });
  }

  return hits
    .sort(
      (x, y) =>
        x.score - y.score ||
        // Dhaka/Chattogram er elaka age - sekhanei chahida sob theke beshi
        tierRank(x.area.tier) - tierRank(y.area.tier) ||
        x.area.bn.localeCompare(y.area.bn, 'bn'),
    )
    .slice(0, limit)
    .map((h) => ({ area: h.area, label: areaLabel(h.area.id) }));
}

const TIER_RANK: Record<AreaTier, number> = {
  'dhaka-premium': 0,
  metro: 1,
  divisional: 2,
  'district-town': 3,
  upazila: 4,
};
const tierRank = (t: AreaTier) => TIER_RANK[t];

/** "মিরপুর, ঢাকা" - job card o post e ei rokom dekhabe */
export function areaLabel(areaId: string): string {
  const a = findArea(areaId);
  if (!a) return '';
  const d = findDistrict(a.districtId);
  return d ? `${a.bn}, ${d.bn}` : a.bn;
}

/* ── Duratto ─────────────────────────────────────────────── */

/** Elakar coordinate - na thakle jelar kendro use hoy */
function coordsOf(area: Area): { lat: number; lon: number } | null {
  if (typeof area.lat === 'number' && typeof area.lon === 'number') {
    return { lat: area.lat, lon: area.lon };
  }
  const d = findDistrict(area.districtId);
  return d ? { lat: d.lat, lon: d.lon } : null;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Duita elakar sorolrekha duratto (km).
 * Rastar duratto NA - sadharonoto rastar duratto er cheye 20-30% kom hoy.
 * Apply er sotorkotar jonno eituku i jothesto.
 *
 * Coordinate na pele null.
 */
export function distanceKm(areaIdA: string, areaIdB: string): number | null {
  const a = findArea(areaIdA);
  const b = findArea(areaIdB);
  if (!a || !b) return null;
  if (a.id === b.id) return 0;

  const ca = coordsOf(a);
  const cb = coordsOf(b);
  if (!ca || !cb) return null;

  const R = 6371;
  const dLat = toRad(cb.lat - ca.lat);
  const dLon = toRad(cb.lon - ca.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(ca.lat)) * Math.cos(toRad(cb.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export const AREA_TIER_LABEL: Record<AreaTier, string> = {
  'dhaka-premium': 'ঢাকা - অভিজাত এলাকা',
  metro: 'ঢাকা ও চট্টগ্রাম মহানগর',
  divisional: 'বিভাগীয় শহর',
  'district-town': 'জেলা শহর',
  upazila: 'উপজেলা / গ্রাম',
};

/* ══════════════════════════════════════════════════════════════
   URL er slug - elakar pata er jonno
   /jobs/area/dhaka/mirpur
   ══════════════════════════════════════════════════════════════ */

/**
 * Slug INGREJI nam theke banano hoy, Bangla theke NA.
 * Bangla dile URL e %E0%A6%AE... hoye jeto - kuthsit, ar manush
 * link copy kore pathate bhoy peto.
 */
const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const divisionSlug = (d: Division): string => toSlug(d.name);
export const areaSlug = (a: Area): string => toSlug(a.name);

/**
 * Ek i nam ekadhik jelay ache (Mirpur - Dhaka o Kushtia).
 * Tai slug khoja hoy BIBHAG er bhitore - nahole Kushtia r
 * Mirpur er pata Dhaka r nam niye khule jeto.
 */
const slugIndex = new Map<string, Area>();
for (const a of areas) {
  const d = districtById.get(a.districtId);
  if (!d) continue;
  const div = divisionById.get(d.divisionId);
  if (!div) continue;
  const key = `${toSlug(div.name)}/${toSlug(a.name)}`;
  // Prothom ta i thakbe - jela onujayi sajano, tai sthir
  if (!slugIndex.has(key)) slugIndex.set(key, a);
}

export function findAreaBySlug(
  divisionSlugValue: string,
  areaSlugValue: string,
): Area | undefined {
  return slugIndex.get(`${divisionSlugValue.toLowerCase()}/${areaSlugValue.toLowerCase()}`);
}

export function findDivisionBySlug(slug: string): Division | undefined {
  const s = slug.toLowerCase();
  return divisions.find((d) => toSlug(d.name) === s);
}

/** Elakar pata er purno path */
export function areaPath(area: Area): string | null {
  const d = districtById.get(area.districtId);
  const div = d ? divisionById.get(d.divisionId) : undefined;
  if (!div) return null;
  return `/jobs/area/${toSlug(div.name)}/${toSlug(area.name)}`;
}

/** Ek i jelar aasepasher elaka - "kase r elaka" dekhanor jonno */
export function siblingAreas(areaId: string, limit = 8): Area[] {
  const a = findArea(areaId);
  if (!a) return [];
  return areas
    .filter((x) => x.districtId === a.districtId && x.id !== a.id)
    .slice(0, limit);
}
