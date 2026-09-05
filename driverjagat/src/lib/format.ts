/**
 * Bangla te sonkha, taka o somoy dekhano.
 *
 * `toLocaleString('bn-BD')` byabohar kori NA - icchakritobhabe.
 * Duita karon:
 *   1. Server o browser e ICU alada hole ek i sonkha dui rokom ashe,
 *      ar React hydration error dey - pura pata bhenge jay.
 *   2. Bangladesh e lakh/koti hishab (১,০০,০০০) - sob browser thik kore na.
 * Tai hate likha, ekdom nirdishto.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** 2026 → ২০২৬ · sob ASCII onko Bangla te */
export function toBn(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** ২০২৬ → 2026 · form er input pore hishab korte lage */
export function fromBn(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/**
 * Bangladesh er niyome group - sesher 3 ta, tarpor 2 kore.
 *   4000    → 4,000
 *   100000  → 1,00,000
 *   1250000 → 12,50,000
 */
function groupBD(n: number): string {
  /**
   * NaN ba Infinity hole SHUNYO dhora hoy.
   *
   * Chara "৳NaN" lekha uthto. Oi ekta lekha dekhe manush bhabten
   * puro site ta bhanga, ar taka niye bhorosa i kore felten.
   * Database e ekta ghor bethik thakleo bakituku thik dekhano
   * bhalo.
   */
  if (!Number.isFinite(n)) n = 0;

  const neg = n < 0;
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return (neg ? '-' : '') + s;

  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + grouped + ',' + last3;
}

/** 4000 → ৳৪,০০০ */
export function taka(n: number): string {
  return '৳' + toBn(groupBD(n));
}

/** 4000, 6000 → ৳৪,০০০ - ৬,০০০ · job card e ei rokom i dekhabe */
export function takaRange(min: number, max: number): string {
  if (min === max) return taka(min);
  return `${taka(min)} - ${toBn(groupBD(max))}`;
}

/** 12 → ১২ · gonona dekhanor jonno */
export const count = (n: number): string => toBn(groupBD(n));

/** 5 → ৫টি */
export const countOf = (n: number, unit = 'টি'): string => toBn(n) + unit;

/** 4.5 → ৪.৫ · doshomik soho */
export function decimal(n: number, places = 1): string {
  return toBn(n.toFixed(places));
}

/** 19.3 → ১৯.৩ কিমি */
export const km = (n: number): string => decimal(n) + ' কিমি';

/* ── Somoy - 07-DESIGN-SYSTEM: kacha date na, "2 ghonta age" ── */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "এইমাত্র" · "৫ মিনিট আগে" · "২ ঘণ্টা আগে" · "৩ দিন আগে"
 *
 * `now` alada kore neya hoy jate server o client ek i uttor dey - * nahole hydration e gorbor hobe.
 */
export function timeAgo(then: Date | number, now: Date | number = Date.now()): string {
  const diff = (typeof now === 'number' ? now : now.getTime()) -
    (typeof then === 'number' ? then : then.getTime());

  if (diff < 0) return 'এইমাত্র';
  if (diff < MINUTE) return 'এইমাত্র';
  if (diff < HOUR) return `${toBn(Math.floor(diff / MINUTE))} মিনিট আগে`;
  if (diff < DAY) return `${toBn(Math.floor(diff / HOUR))} ঘণ্টা আগে`;
  if (diff < 7 * DAY) return `${toBn(Math.floor(diff / DAY))} দিন আগে`;
  if (diff < 30 * DAY) return `${toBn(Math.floor(diff / (7 * DAY)))} সপ্তাহ আগে`;
  if (diff < 365 * DAY) return `${toBn(Math.floor(diff / (30 * DAY)))} মাস আগে`;
  return `${toBn(Math.floor(diff / (365 * DAY)))} বছর আগে`;
}

/** Feed e somoy diye bhag - "এইমাত্র · আজ · গতকাল · আগের" (D-64) */
export const FEED_GROUP = {
  now: 'now',
  today: 'today',
  yesterday: 'yesterday',
  older: 'older',
} as const;
export type FeedGroup = (typeof FEED_GROUP)[keyof typeof FEED_GROUP];

export const FEED_GROUP_LABEL: Record<FeedGroup, string> = {
  now: 'এইমাত্র',
  today: 'আজ',
  yesterday: 'গতকাল',
  older: 'আগের',
};

export function feedGroup(then: Date | number, now: Date | number = Date.now()): FeedGroup {
  const t = typeof then === 'number' ? then : then.getTime();
  const n = typeof now === 'number' ? now : now.getTime();
  const diff = n - t;
  if (diff < HOUR) return FEED_GROUP.now;
  if (diff < DAY) return FEED_GROUP.today;
  if (diff < 2 * DAY) return FEED_GROUP.yesterday;
  return FEED_GROUP.older;
}

/** ২০ আগস্ট ২০২৬ - itihash er block e ei rokom */
const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export function dateBn(d: Date): string {
  return `${toBn(d.getDate())} ${MONTHS_BN[d.getMonth()]} ${toBn(d.getFullYear())}`;
}

/** "2026-09" → সেপ্টেম্বর ২০২৬ · job er availableFrom er jonno */
export function monthBn(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${MONTHS_BN[idx]} ${toBn(m[1])}`;
}

/* ── Phone ─────────────────────────────────────────────────── */

/** +8801712345678 → 017*****78 · unlock er age ei rokom dekhabe */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('880') ? '0' + digits.slice(3) : digits;
  if (local.length < 7) return '***';
  return local.slice(0, 3) + '*'.repeat(local.length - 5) + local.slice(-2);
}

/** +8801712345678 → ০১৭১২৩৪৫৬৭৮ · unlock er por */
export function phoneBn(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('880') ? '0' + digits.slice(3) : digits;
  return toBn(local);
}
