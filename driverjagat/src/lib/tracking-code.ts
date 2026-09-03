/**
 * Tracking code - DJ-HD-00123
 *
 * Malik er chinta: code dekhei jeno ANDAZ kora jay.
 * Tai duita letter - ekta MASH er, ekta BIBHAG er (ba online).
 *
 *     TJ - H D - 00123
 *     │    │ │   └── serial: global, KOKHONO reset hoy na
 *     │    │ └────── jaiga:  D=Dhaka, C=Chattogram, O=online...
 *     │    └──────── mash:   A=January ... L=December
 *     └───────────── brand
 *
 * Prottek mash er 1 tarikh e prothom letter bodlabe, ar bibhag onujayi
 * ditiyo letter bodlabe - tai DJ-HD dekhlei bojha jay "August, Dhaka".
 *
 * Serial global rakha hoyeche, mash onujayi reset kora HOY NA.
 * Karon sompurno job er pata chirodin theke jay (D-52) - reset korle
 * porer bochor ek i code abar toiri hoto, ar purono pata harie jeto.
 */

import { divisions } from '@/data/locations';
import { siteConfig } from '@/config/site';

/* ── Mash - A theke L ─────────────────────────────────────── */

const MONTH_LETTERS = 'ABCDEFGHIJKL';

/** 1 = January … 12 = December */
export function monthLetter(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) {
    throw new Error('mash 1 theke 12 er moddhe hote hobe: ' + month1to12);
  }
  return MONTH_LETTERS[month1to12 - 1];
}

export const MONTH_NAME_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
] as const;

/* ── Jaiga - bibhag ba online ─────────────────────────────── */

/**
 * Bibhag er nam → ekta letter.
 *
 * Rajshahi ebong Rangpur duitai R diye shuru - tai Rangpur ke
 * N deya hoyeche (raNgpur). Duita ek letter hole code ta ondho hoye jeto.
 */
const DIVISION_LETTER_BY_NAME: Record<string, string> = {
  Dhaka: 'D',
  Chattagram: 'C',
  Chattogram: 'C',
  Chittagong: 'C',
  Rajshahi: 'R',
  Khulna: 'K',
  Barisal: 'B',
  Barishal: 'B',
  Sylhet: 'S',
  Rangpur: 'N',
  Mymensingh: 'M',
};

/** Online job - kono bibhag nai, tai nijer letter */
export const ONLINE_LETTER = 'O';
/** Admin phone e likhchen, elaka ekhono jana nai */
export const UNKNOWN_LETTER = 'X';

const letterByDivisionId = new Map<string, string>();
for (const d of divisions) {
  const letter = DIVISION_LETTER_BY_NAME[d.name];
  if (letter) letterByDivisionId.set(d.id, letter);
}

export function divisionLetter(divisionId: string | null | undefined): string {
  if (!divisionId) return UNKNOWN_LETTER;
  return letterByDivisionId.get(divisionId) ?? UNKNOWN_LETTER;
}

/** Letter → manush er pora jay emon nam */
const PLACE_NAME_BN: Record<string, string> = {
  D: 'ঢাকা',
  C: 'চট্টগ্রাম',
  R: 'রাজশাহী',
  K: 'খুলনা',
  B: 'বরিশাল',
  S: 'সিলেট',
  N: 'রংপুর',
  M: 'ময়মনসিংহ',
  [ONLINE_LETTER]: 'অনলাইন',
  [UNKNOWN_LETTER]: 'অজানা',
};

/* ── Code banano ──────────────────────────────────────────── */

export interface TrackingCodeInput {
  /** Job toiri howar shomoy - Asia/Dhaka timezone e (CLAUDE.md #15) */
  month: number;
  /** Online hole bibhag lage na */
  online?: boolean;
  divisionId?: string | null;
  /** Global counter, kokhono reset hoy na */
  serial: number;
}

const SERIAL_PAD = 5;

export function makeTrackingCode(i: TrackingCodeInput): string {
  const m = monthLetter(i.month);
  const p = i.online ? ONLINE_LETTER : divisionLetter(i.divisionId);
  const s = String(i.serial).padStart(SERIAL_PAD, '0');
  return `${siteConfig.trackingPrefix}-${m}${p}-${s}`;
}

/* ── Code pora ────────────────────────────────────────────── */

export interface ParsedTrackingCode {
  month: number;
  monthName: string;
  placeLetter: string;
  placeName: string;
  isOnline: boolean;
  serial: number;
}

const CODE_RE = /^([A-Z]{2})-([A-L])([A-Z])-(\d{4,7})$/;

/**
 * Admin panel e code dekhle poripurno tottho - "আগস্ট · ঢাকা · #123"
 * Bhul code hole null, throw kore na.
 */
export function parseTrackingCode(code: string): ParsedTrackingCode | null {
  const m = CODE_RE.exec(code.trim().toUpperCase());
  if (!m) return null;

  const [, prefix, monthCh, placeCh, serialStr] = m;
  if (prefix !== siteConfig.trackingPrefix) return null;

  const monthIdx = MONTH_LETTERS.indexOf(monthCh);
  if (monthIdx < 0) return null;

  return {
    month: monthIdx + 1,
    monthName: MONTH_NAME_BN[monthIdx],
    placeLetter: placeCh,
    placeName: PLACE_NAME_BN[placeCh] ?? 'অজানা',
    isOnline: placeCh === ONLINE_LETTER,
    serial: Number(serialStr),
  };
}

export const isValidTrackingCode = (code: string): boolean =>
  parseTrackingCode(code) !== null;

/** "আগস্ট · ঢাকা · #১২৩" - admin er chokher jonno */
export function describeTrackingCode(code: string): string {
  const p = parseTrackingCode(code);
  if (!p) return 'অবৈধ কোড';
  return `${p.monthName} · ${p.placeName} · #${p.serial}`;
}

/**
 * Manush phone e bole, tai space/dash/choto haater okkhor sob
 * mene nite hobe. "tj hd 123" likhleo cholbe.
 */
export function normalizeTrackingCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[\s-]+/g, '');
  const m = /^([A-Z]{2})([A-L])([A-Z])(\d{1,7})$/.exec(cleaned);
  if (!m) return null;
  const [, prefix, mo, pl, serial] = m;
  if (prefix !== siteConfig.trackingPrefix) return null;
  return `${prefix}-${mo}${pl}-${serial.padStart(SERIAL_PAD, '0')}`;
}
