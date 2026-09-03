/**
 * Byabsar sob niyom o sonkha - EK jaygay.
 *
 * Kono component ba server action e ei sonkha gulo hardcode korben NA.
 * Bodlanor dorkar hole ekhane bodlaben - puro app e ek shathe bodlabe.
 *
 * Utso: docs/DECISIONS.md (D-002 - pricing placeholder, malik confirm korben)
 */

import { PAYMENT_KIND, type PaymentKind } from '@/types/enums';

/* ══════════════════════════════════════════════════════════════
   1 · TAKA - launch pricing (D-002, PLACEHOLDER)
   Fee ke boro kore dekhano hobe NA - "admin verification charge"
   hishebe halka kore, shesh e. (TutorJagat D-101 er niyom)
   ══════════════════════════════════════════════════════════════ */

export const FEES = {
  /** Job prokash er fee - admin approve er PORE neya hoy */
  jobFee: 100,
  /**
   * Dui pokkho razi howar por number binimoy er fee - malik den.
   *
   * Ei fee ta ASOL ay er jayga. Post shosta rakha hoyeche jate
   * kajer sorboraho bare - ar taka asha hoy tokhon i jokhon amra
   * SOTTI kaj ta kore diyechi (driver niyog hoyeche). Driver
   * agency r 3-5 hajar er tulonay ৳500 kichu i na - eta i wedge.
   */
  connectionFee: 500,
} as const satisfies Record<string, number>;

/**
 * Amount SOB SOMOY ei function theke - client theke KOKHONO na.
 * Keu browser er JS bodle `amount: 1` pathale ei function er
 * sonkha i jitbe (lib/server/payments.ts ei ta i daake).
 */
export const paymentAmount = (kind: PaymentKind): number | null => {
  switch (kind) {
    case PAYMENT_KIND.job_fee:
      return FEES.jobFee;
    case PAYMENT_KIND.connection_fee:
      return FEES.connectionFee;
    case PAYMENT_KIND.renewal:
      return FEES.jobFee;
    default:
      return null;
  }
};

/* ══════════════════════════════════════════════════════════════
   2 · JOB ER MEYAD (D-005)
   ══════════════════════════════════════════════════════════════ */

export const JOB = {
  /**
   * RentJagat er 60 o NA - driver er kaj 1-2 soptaho e bhore jay.
   * Stale "ড্রাইভার চাই" post i Facebook group gulor 1 number rog,
   * ar amader parthokko i holo feed e sob kichu SOTTI khali ache.
   */
  validDays: 30,

  /**
   * FAK BONDHO KORA - admin approve korar por koto din er moddhe
   * taka na dile approval ta bate jabe.
   */
  approvedUnpaidExpiryDays: 7,
  /** Meyad sesher age koto din e mone koriye deya hobe */
  approvedUnpaidReminderDays: 3,

  /** Free post NAI - RentJagat er moto (D-002) */
  freeQuota: 0,

  /**
   * Gari r chobi OICHHIK (D-008). Driver er kaj e chobi chara o
   * post chole - kintu dile bishwas bare. Sorbocho 3 ta.
   */
  minPhotos: 0,
  maxPhotos: 3,
} as const;

/* ══════════════════════════════════════════════════════════════
   3 · AGROHI DRIVER BACHAI O NUMBER BINIMOY

   TutorJagat er sob theke daami shikkha ekhane o khatbe:
   keu NIJERA kono number pan na. ADMIN phone koren. Dui pokkho
   razi hole SUDHU tokhon i number o purno thikana binimoy hoy -
   ar baki agrohi ra KOKHONO jante paren na koyjon agrohi chilo.
   ══════════════════════════════════════════════════════════════ */

export const MATCHING = {
  /** Ek shathe koyjon agrohi driver niye admin alochona chalaben */
  shortlistSize: 3,
  /** Shortlist er por admin eto ghontar moddhe phone korben */
  callWithinHours: 24,
  /** Na korle admin er kiu te lal hoye uthbe */
  escalateAfterHours: 48,
} as const;

/* ══════════════════════════════════════════════════════════════
   4 · TRACKING PATA - nirapotta
   Tracking code job card e PROKASHSHO (DJ-HD-00123).
   Dhukar niyom "code + phone" - sudhu code diye KICHU i dekha
   jay na, nahole keu 00001 theke gone gone sob dekhto.
   ══════════════════════════════════════════════════════════════ */

export const TRACKING_ACCESS = {
  /** Ek IP theke ghontay koyta cheshta */
  attemptsPerHour: 10,
  /** Eto bar bhul hole oi IP eto minute block */
  lockoutMinutes: 30,
  /** Admin er pathano ordhek-bhora form er link - token koto oksor */
  tokenLength: 32,
} as const;

/* ══════════════════════════════════════════════════════════════
   5 · SWITCH - settings theke bodlano jabe
   Ei gulo default. Admin settings e bodlale DB er mullo jitbe.
   ══════════════════════════════════════════════════════════════ */

export const DEFAULT_SETTINGS = {
  /**
   * Job post korte LOGIN LAGE - guest post nai.
   *
   * Karon post ekta choloman somporko - dashboard e status,
   * payment, renewal sob dekhte hoy. Ar bhua post thekano i
   * amader asol ponno - guest post dile seta mara jay.
   * (Driver er lead ta guest e deya jay - demand side e kono
   * friction na, driver der beshirbhag er email account o nai.)
   */
  allowGuestPosting: false,
  /** Ek phone theke din e sorbocho koyta joma */
  submissionsPerPhonePerDay: 2,
  /** Emergency te SMS bondho korar switch */
  smsEnabled: true,
  /** Puro site maintenance mode e */
  maintenanceMode: false,
  /** Sob pata er upore ekta banner */
  announcement: null as string | null,
} as const;

/**
 * Type gulo CHORA kore lekha - `typeof DEFAULT_SETTINGS` NA.
 * `as const` er karone mapped type nile `maintenanceMode` er type
 * hoye jeto `false` - switch ta KOKHONO on kora jeto na.
 */
export interface AppSettings {
  allowGuestPosting: boolean;
  submissionsPerPhonePerDay: number;
  smsEnabled: boolean;
  maintenanceMode: boolean;
  announcement: string | null;
}

/* ══════════════════════════════════════════════════════════════
   6 · ADMIN ER LOKKHO
   ══════════════════════════════════════════════════════════════ */

export const ADMIN_TARGET = {
  /** Job review er median somoy - ghonta */
  reviewMedianHours: 12,
  /** Kiu te eto ta jome gele alert */
  backlogAlertCount: 20,
  /** Ekta item khule rakhle onno admin er kase koto minute 'dekhchen' dekhabe */
  claimMinutes: 10,
} as const;

/* ══════════════════════════════════════════════════════════════
   7 · FORM
   ══════════════════════════════════════════════════════════════ */

export const FORM = {
  /**
   * "আগ্রহী" button er form - nam, phone, license, obhiggota.
   * RentJagat e 3 ghor chilo; ekhane license ar obhiggota na
   * thakle admin protita driver ke phone kore jiggesh korte
   * hoto - 4 ghor e admin er ordhek call beche jay.
   */
  contactLeadFieldCount: 4,
  /** Khosra koto din dhore rakha hobe */
  draftExpiryDays: 7,
  /** Kajer bornona mukto lekha - koto oksor */
  descriptionMaxChars: 500,

  /**
   * Beton er sanity bounds - typo dhorar jonno, byabsayik seema na.
   * Part time 3 hajar theke, company r heavy driver 60 hajar o hoy.
   */
  minSalary: 3000,
  maxSalary: 150_000,
  /** Sorbocho koto bochor er obhiggota chawa jay */
  maxExperienceYears: 30,
} as const;
