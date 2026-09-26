/**
 * "ড্রাইভার চাই" job joma dewar schema - client o server DUIJAYGAY ek i.
 * Server e ABAR parse kora HOBE - client ke bishwas kori na.
 *
 * PROKASHSHO ar GOPON ghor ALADA schema te.
 *
 * Karon: create-job.ts prokashsho doc e `...publicData` chhorate
 * parbe na jodi ek i object e thikana-phone thake - ekta spread bhul
 * hole i PII feed e chole jeto. Duita alada object mane bhul
 * korar rasta i nai: gopon object ta gopon ghor chhara kothao
 * jaowar type i nai. (D-009: malik er thikana-phone-gari r number
 * i ekhane asol PII)
 */

import { z } from 'zod';
import {
  addressSchema,
  anyPhoneSchema,
  areaIdSchema,
  bdPhoneSchema,
  descriptionSchema,
  districtIdSchema,
  divisionIdSchema,
  enumOf,
  experienceYearsSchema,
  landmarkSchema,
  nameSchema,
  optionalEmailSchema,
  salarySchema,
  startFromSchema,
} from './primitives';
import {
  BENEFIT,
  DUTY_HOURS,
  EMPLOYER_TYPE,
  HEAVY_VEHICLES,
  JOB_TYPE,
  LICENSE_TYPE,
  RESIDENCE,
  VEHICLE_TYPE,
} from '@/types/enums';

/* ══════════════════════════════════════════════════════════════
   1 · PROKASHSHO ONGSHO - card e ja dekha jabe
   Ekhane malik er nam-phone, purno thikana, gari r number -
   KICHU I NA. Elaka porjonto i shesh (D-009).
   ══════════════════════════════════════════════════════════════ */

export const jobPublicSchema = z
  .object({
    jobType: enumOf(JOB_TYPE, 'কাজের ধরন'),
    vehicleType: enumOf(VEHICLE_TYPE, 'গাড়ির ধরন'),
    employerType: enumOf(EMPLOYER_TYPE, 'কে ড্রাইভার খুঁজছেন'),

    /* ── Taka ── */
    /** Mashik beton - part time / contract hole o mashik hishab e lekha */
    salary: salarySchema,
    /** "beton alochona sapekkhe" - card e beton er pashe dekhay */
    salaryNegotiable: z.boolean().default(false),
    benefits: z.array(enumOf(BENEFIT)).max(Object.keys(BENEFIT).length).default([]),

    /* ── Kajer shorto ── */
    dutyHours: enumOf(DUTY_HOURS, 'ডিউটি'),
    residence: enumOf(RESIDENCE, 'থাকার ব্যবস্থা'),
    licenseRequired: enumOf(LICENSE_TYPE, 'কোন লাইসেন্স লাগবে'),
    /** Kom pokkhe koto bochor er obhiggota - 0 mane notun o chole */
    experienceYearsMin: experienceYearsSchema,

    /** Kon mash theke driver lagbe - stale post thekanor mul ghor */
    startFrom: startFromSchema,

    /* ── Thikana - ELAKA porjonto, tar beshi gopon ghore ── */
    divisionId: divisionIdSchema,
    districtId: districtIdSchema,
    /** Driver kaj khoje nijer elakay - tai ekhane BADDHOTAMULOK */
    areaId: areaIdSchema,

    /* ── Mukto lekha ── */
    description: descriptionSchema,
  })
  /**
   * Truck / bus / covered van e HALKA license chole na - BRTA
   * niyom. Ei bhul form e i atkai, admin er somoy noshto na kore.
   */
  .refine(
    (d) =>
      !HEAVY_VEHICLES.includes(d.vehicleType) ||
      d.licenseRequired === LICENSE_TYPE.medium ||
      d.licenseRequired === LICENSE_TYPE.heavy,
    {
      path: ['licenseRequired'],
      message: 'ভারী গাড়ির জন্য মধ্যম বা ভারী লাইসেন্স বাছুন',
    },
  )
  /** Motorcycle e motorcycle license i lagbe - ulto ta o bhul */
  .refine(
    (d) =>
      (d.vehicleType === VEHICLE_TYPE.motorcycle) ===
      (d.licenseRequired === LICENSE_TYPE.motorcycle),
    {
      path: ['licenseRequired'],
      message: 'মোটরসাইকেলের জন্য মোটরসাইকেল লাইসেন্স, অন্য গাড়ির জন্য অন্য লাইসেন্স বাছুন',
    },
  );

export type JobPublic = z.infer<typeof jobPublicSchema>;

/* ══════════════════════════════════════════════════════════════
   2 · GOPON ONGSHO - private/ subcollection e jabe
   Browser ei ghor CHAITE O pare na (firestore.rules).
   Purno thikana ar phone ekhane i thake - eta leak hole driver
   soja giye dalali bypass korbe, connection fee mara jabe.
   ══════════════════════════════════════════════════════════════ */

export const jobPrivateSchema = z.object({
  /** Gari r MALIK ba company r jogajog er manush er nam */
  employerName: nameSchema,
  /** Jogajog er number - admin ei number e i phone korben */
  phone: bdPhoneSchema,
  /** Probashi malik hole bideshi number ekhane */
  altPhone: anyPhoneSchema.optional(),
  email: optionalEmailSchema,
  /** Gari jekhane thake / duty r thikana - bari/road/holding soho */
  fullAddress: addressSchema,
  /** "X schooler pashe" - admin ke jayga chinte sahajjo kore */
  landmark: landmarkSchema,
  /** Gari r registration number - malikana jachai er jonno, oichhik */
  vehicleRegNo: z.string().trim().max(30).optional(),
});

export type JobPrivate = z.infer<typeof jobPrivateSchema>;

/* ══════════════════════════════════════════════════════════════
   3 · PURO FORM - duitar mishron, form ekbar e joma dey
   ══════════════════════════════════════════════════════════════ */

export const jobIntakeSchema = z.object({
  public: jobPublicSchema,
  private: jobPrivateSchema,
});

export type JobIntake = z.infer<typeof jobIntakeSchema>;

/* ══════════════════════════════════════════════════════════════
   4 · DRIVER ER LEAD - "এই কাজে আগ্রহী" form
   Login lage na. 4 ghor + oichhik note (FORM.contactLeadFieldCount).
   ══════════════════════════════════════════════════════════════ */

export const leadSchema = z.object({
  name: nameSchema,
  phone: bdPhoneSchema,
  licenseType: enumOf(LICENSE_TYPE, 'আপনার লাইসেন্স'),
  experienceYears: experienceYearsSchema,
  note: z.string().trim().max(300).optional(),
});

export type LeadIntake = z.infer<typeof leadSchema>;
