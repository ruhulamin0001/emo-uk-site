/**
 * Sob schema er bhitti.
 *
 * Ei file er niyom CLIENT o SERVER duijaygay ek i chole.
 * Server e abar parse kora HOBE - client ke bishwas kori na
 * (CLAUDE.md niyom #11).
 *
 * Bhul barta sob SOB SOMOY Bangla te - user ei ta pore (niyom #20).
 */

import { z } from 'zod';
import { findArea, findDistrict, findDivision } from '@/lib/locations';
import { FORM } from '@/config/business';
import { toBn } from '@/lib/format';

/* ══════════════════════════════════════════════════════════════
   0 · SHESH BHOROSA - Zod er nijer lekha BANGLAY
   ══════════════════════════════════════════════════════════════ */

/**
 * Amra protita ghore nijera bangla barta likhi. Kintu ekta
 * bad porleI Zod NIJER INGREJI lekha dekhay:
 *
 *     Invalid option: expected one of "home"|"online"|"both"
 *     Invalid input: expected string, received undefined
 *
 * Ekjon obhibhabok Mirpur e boshe form bhorchhen, ekta ghor
 * bhulechhen - ar amra take EI lekha ta dekhachhilam. Tini
 * bujhtenI na ki chaicchi, ar form ta chhere chole jeten.
 *
 * Ei bhul ta KONO test e dhora porto na - schema thik i kaj
 * korto, sudhu LEKHATA ingreji chilo. Sotti form ta bhore na
 * dekhle bojha jeto na.
 *
 * Ekhane ekta SHESH BHOROSA bosano holo. Amader nijer lekha
 * barta thakle SETA i jete, ei ta sudhu tokhon i kotha bole
 * jokhon amra kichhu likhi ni.
 *
 * Ei file ta protita schema ane, tai ei line ta sob jaygay
 * chalu hoye jay - alada kore mone rakhte hoy na.
 */
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type' && issue.input === undefined) {
      return 'এই ঘরটি লাগবে';
    }
    switch (issue.code) {
      case 'invalid_type':
        return 'এখানে অন্য কিছু লাগবে';
      case 'invalid_value':
      case 'invalid_format':
        return 'এটি ঠিক নেই';
      case 'too_small':
        return 'আরেকটু বড় করে দিন';
      case 'too_big':
        return 'অনেক বড় হয়ে গেছে';
      default:
        return 'এটি ঠিক নেই';
    }
  },
});

/* ══════════════════════════════════════════════════════════════
   1 · PHONE
   ══════════════════════════════════════════════════════════════ */

/** Bangladesh er mobile operator prefix - 013 theke 019 */
const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

/**
 * Manush jevabe likhe: 01712345678 · +8801712345678 · 8801712345678
 * · 017 1234 5678 · 017-1234-5678 · ০১৭১২৩৪৫৬৭৮
 *
 * Sob ek rokom kore dey: +8801712345678
 * Na milleI null.
 */
export function normalizeBdPhone(raw: string): string | null {
  // Bangla onko o mene nite hobe - keyboard bodle onek e Bangla te likhe
  const ascii = raw.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
  let digits = ascii.replace(/\D/g, '');

  if (digits.startsWith('880')) digits = digits.slice(3);
  else if (digits.startsWith('88')) digits = digits.slice(2);

  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits;
  if (!BD_MOBILE_RE.test(digits)) return null;

  return '+880' + digits.slice(1);
}

export const isBdPhone = (raw: string): boolean => normalizeBdPhone(raw) !== null;

/** Job o lead e Bangladeshi number baddhotamulok */
export const bdPhoneSchema = z
  .string()
  .trim()
  .min(1, 'মোবাইল নম্বর দিন')
  .transform((v, ctx) => {
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({
        code: 'custom',
        message: 'সঠিক মোবাইল নম্বর দিন - যেমন ০১৭১২৩৪৫৬৭৮',
      });
      return z.NEVER;
    }
    return n;
  });

/**
 * Probashi malik onek - UK, USA, Saudi, Malaysia theke gari
 * chalan. Tader number Bangladeshi hobe NA. Tai ekhane sudhu
 * dekhbo bastobsommoto kina.
 */
export const anyPhoneSchema = z
  .string()
  .trim()
  .min(1, 'মোবাইল নম্বর দিন')
  .transform((v, ctx) => {
    const ascii = v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const digits = ascii.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      ctx.addIssue({ code: 'custom', message: 'সঠিক মোবাইল নম্বর দিন' });
      return z.NEVER;
    }
    // Bangladeshi hole ek rokom kore rakhi, na hole + soho
    return normalizeBdPhone(v) ?? '+' + digits;
  });

/* ══════════════════════════════════════════════════════════════
   2 · NAM O LEKHA
   ══════════════════════════════════════════════════════════════ */

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'নাম অন্তত ২ অক্ষরের হতে হবে')
  .max(60, 'নাম অনেক বড় হয়ে গেছে')
  .refine((v) => !/^\d+$/.test(v), 'নামের জায়গায় শুধু সংখ্যা দেওয়া যাবে না');

export const emailSchema = z.email('সঠিক ইমেইল দিন').trim().toLowerCase();

/** Oichhik email - faka string mane "dei ni", bhul na */
export const optionalEmailSchema = z
  .union([z.literal(''), emailSchema])
  .transform((v) => (v === '' ? undefined : v))
  .optional();

export const addressSchema = z
  .string()
  .trim()
  .min(5, 'ঠিকানা আরেকটু বিস্তারিত লিখুন')
  .max(200, 'ঠিকানা অনেক বড় হয়ে গেছে');

export const landmarkSchema = z.string().trim().max(120).optional();

/** Kajer bornona - mukto lekha, seema config/business.ts e */
export const descriptionSchema = z
  .string()
  .trim()
  .max(FORM.descriptionMaxChars, `সর্বোচ্চ ${FORM.descriptionMaxChars} অক্ষর`)
  .optional();

/* ══════════════════════════════════════════════════════════════
   3 · THIKANA - data er sathe milie dekha
   Sudhu "string ache" dekhle jothesto na. Bhua elaka id
   pathale server ta niye nebe - tarpor feed e post ta kothao
   dekhabe na. Tai asol data er sathe milie dekhte HOBE.
   ══════════════════════════════════════════════════════════════ */

export const divisionIdSchema = z
  .string()
  .refine((v) => findDivision(v) !== undefined, 'বিভাগ বাছুন');

export const districtIdSchema = z
  .string()
  .refine((v) => findDistrict(v) !== undefined, 'জেলা বাছুন');

export const areaIdSchema = z
  .string()
  .refine((v) => findArea(v) !== undefined, 'এলাকা বাছুন');

/** Elaka ta sotti oi jelar bhitore kina */
export function areaBelongsToDistrict(areaId: string, districtId: string): boolean {
  const a = findArea(areaId);
  return a !== undefined && a.districtId === districtId;
}

/* ══════════════════════════════════════════════════════════════
   4 · SONKHA
   ══════════════════════════════════════════════════════════════ */

/** Form theke string ashe - "4000" ba "৪০০০" */
export const bnNumber = (opts: { min?: number; max?: number; label?: string } = {}) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const raw = typeof v === 'number'
        ? String(v)
        : v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
      const n = Number(raw.replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: 'custom', message: `${opts.label ?? 'সংখ্যা'} দিন` });
        return z.NEVER;
      }
      /* Onko gulo o BANGLAY - "কমপক্ষে 1 হতে হবে" lekha
         thakle ordhek bangla ordhek ingreji dekhato (niyom #15) */
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({ code: 'custom', message: `কমপক্ষে ${toBn(opts.min)} হতে হবে` });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({ code: 'custom', message: `সর্বোচ্চ ${toBn(opts.max)}` });
        return z.NEVER;
      }
      return n;
    });

/**
 * Mashik beton - seema config/business.ts theke, typo dhorar jonno.
 * Part time ৳3,000 theke, company r heavy driver ৳1.5 lakh porjonto.
 */
export const salarySchema = bnNumber({
  min: FORM.minSalary,
  max: FORM.maxSalary,
  label: 'মাসিক বেতন',
});

/** Obhiggota koto bochor - 0 o hote pare (notun driver) */
export const experienceYearsSchema = bnNumber({
  min: 0,
  max: FORM.maxExperienceYears,
  label: 'অভিজ্ঞতা',
});

/**
 * Kon mash theke driver lagbe - "2026-09" gathon.
 * Date object na - somoy-zone er jhamela nai, sort o sohoj.
 */
export const startFromSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'কোন মাস থেকে ড্রাইভার লাগবে তা বাছুন');

/**
 * Zod er enum object theke - protibar hate likhte hobe na.
 *
 * BARTA TA BANGLAY. Ei ta na dile Zod nijer INGREJI lekha
 * dekhato - hubahu ei rokom:
 *
 *     Invalid option: expected one of "home"|"online"|"both"
 *
 * Ekjon obhibhabok Mirpur e boshe form bhorchhen, "ধরন" ghor ta
 * bhulechhen - ar take amra ei lekha ta dekhachhilam. Tini
 * bujhtenI na ki chaicchi, ar form ta chhere chole jeten.
 *
 * Ei bhul ta KONO test e dhora porto na - schema thik i kaj
 * korto, sudhu LEKHATA ingreji chilo. Sotti form ta bhore na
 * dekhle bojha jeto na.
 *
 * @param label  "ধরন" → "ধরন বাছুন". Na dile sadharon lekha.
 */
export function enumOf<T extends Record<string, string>>(obj: T, label?: string) {
  const values = Object.values(obj) as [T[keyof T], ...T[keyof T][]];
  return z.enum(values, { error: label ? `${label} বাছুন` : 'একটি বেছে নিন' });
}

/* ══════════════════════════════════════════════════════════════
   5 · SAHAJJO
   ══════════════════════════════════════════════════════════════ */


/**
 * Form e dekhanor jonno - kon ghore ki bhul.
 * { phone: 'সঠিক মোবাইল নম্বর দিন', name: '...' }
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
