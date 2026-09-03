/**
 * Puro app er shared shobdo-bhandar.
 *
 * Kono jaygay string hardcode korben NA - ekhan theke import korben.
 * Notun mullo lagle age ekhane joga korben, tarpor byabohar korben.
 *
 * Prottekta talikar sathe Bangla label ache - tai UI o code kokhono
 * alada hoye jabe na (user ke Bangla, log e English).
 *
 * DriverJagat = TutorJagat blueprint er choturtho clone. Ekhane
 * "job" mane gari r malik er "ড্রাইভার চাই" post, ar "lead" mane
 * oi kaj e agrohi driver.
 */

/* ══════════════════════════════════════════════════════════════
   1 · JOB ER JIBONCHOKRO
   Prokashsho 5 ta dhap - TutorJagat JOB_STAGE / RentJagat
   LISTING_STAGE er hubahu gathon.
   ══════════════════════════════════════════════════════════════ */

export const JOB_STAGE = {
  /** Form joma hoyeche, admin ekhono dekhe ni - prokashsho e kichu nai */
  pending: 'pending',
  /** Feed e live, agrohi driver asha jachhe */
  published: 'published',
  /** Agrohi driver bachai cholche - admin dui pokkher sathe kotha bolchen */
  shortlisted: 'shortlisted',
  /** Interview / trial cholche - admin number diyechen */
  onboarding: 'onboarding',
  /** Niyog hoye geche - amader match e */
  completed: 'completed',
} as const;
export type JobStage = (typeof JOB_STAGE)[keyof typeof JOB_STAGE];

export const JOB_STAGE_ORDER: readonly JobStage[] = [
  JOB_STAGE.pending,
  JOB_STAGE.published,
  JOB_STAGE.shortlisted,
  JOB_STAGE.onboarding,
  JOB_STAGE.completed,
];

export const JOB_STAGE_LABEL: Record<JobStage, string> = {
  pending: 'জমা হয়েছে',
  published: 'প্রকাশিত',
  shortlisted: 'ড্রাইভার বাছাই চলছে',
  onboarding: 'ইন্টারভিউ / ট্রায়াল চলছে',
  completed: 'নিয়োগ হয়ে গেছে',
};

/** Jibonchokrer baire - job ar age bare na */
export const JOB_CLOSED_STATE = {
  rejected: 'rejected',
  needs_edit: 'needs_edit',
  expired: 'expired',
  cancelled: 'cancelled',
  /** Malik nije baire driver niye niyechen - amader match na, feed theke nambe */
  hired_outside: 'hired_outside',
} as const;
export type JobClosedState = (typeof JOB_CLOSED_STATE)[keyof typeof JOB_CLOSED_STATE];

export const JOB_CLOSED_LABEL: Record<JobClosedState, string> = {
  rejected: 'বাতিল',
  needs_edit: 'সংশোধন প্রয়োজন',
  expired: 'মেয়াদ শেষ',
  cancelled: 'প্রত্যাহার',
  hired_outside: 'অন্যভাবে নিয়োগ হয়েছে',
};

export type JobStatus = JobStage | JobClosedState;

/* ══════════════════════════════════════════════════════════════
   2 · KAJER DHORON (D-003: v1 scope)
   ══════════════════════════════════════════════════════════════ */

export const JOB_TYPE = {
  /** Mashik beton e full time - sob theke common */
  full_time: 'full_time',
  /** Din e koyek ghonta - school drop, office drop */
  part_time: 'part_time',
  /** Trip bhittik / contract - bhara gari, tour */
  contract: 'contract',
  /** Koyek din er jonno - purono driver chhuti te */
  temporary: 'temporary',
} as const;
export type JobType = (typeof JOB_TYPE)[keyof typeof JOB_TYPE];

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  full_time: 'ফুল টাইম (মাসিক)',
  part_time: 'পার্ট টাইম',
  contract: 'চুক্তি / ট্রিপ ভিত্তিক',
  temporary: 'অস্থায়ী (কয়েক দিন)',
};

/** Kon gari chalate hobe - card e boro kore dekhano hoy */
export const VEHICLE_TYPE = {
  private_car: 'private_car',
  suv: 'suv',
  microbus: 'microbus',
  pickup: 'pickup',
  covered_van: 'covered_van',
  truck: 'truck',
  bus: 'bus',
  cng_auto: 'cng_auto',
  motorcycle: 'motorcycle',
} as const;
export type VehicleType = (typeof VEHICLE_TYPE)[keyof typeof VEHICLE_TYPE];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  private_car: 'প্রাইভেট কার',
  suv: 'জিপ / এসইউভি',
  microbus: 'মাইক্রোবাস / নোয়া',
  pickup: 'পিকআপ',
  covered_van: 'কাভার্ড ভ্যান',
  truck: 'ট্রাক',
  bus: 'বাস',
  cng_auto: 'সিএনজি / অটো',
  motorcycle: 'মোটরসাইকেল',
};

/** Ei gari gulo chalate BHARI ba MADHYAM license lage (BRTA niyom) */
export const HEAVY_VEHICLES: readonly VehicleType[] = [
  VEHICLE_TYPE.covered_van,
  VEHICLE_TYPE.truck,
  VEHICLE_TYPE.bus,
];

/* ══════════════════════════════════════════════════════════════
   3 · LICENSE - BRTA er tin sreni + motorcycle
   Job e "kon license lagbe", lead e "amar kon license ache".
   ══════════════════════════════════════════════════════════════ */

export const LICENSE_TYPE = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  motorcycle: 'motorcycle',
} as const;
export type LicenseType = (typeof LICENSE_TYPE)[keyof typeof LICENSE_TYPE];

export const LICENSE_TYPE_LABEL: Record<LicenseType, string> = {
  light: 'হালকা (লাইট)',
  medium: 'মধ্যম (মিডিয়াম)',
  heavy: 'ভারী (হেভি)',
  motorcycle: 'মোটরসাইকেল',
};

/** Driver er license ei gari chalanor jonno jothesto kina */
export function licenseCovers(license: LicenseType, vehicle: VehicleType): boolean {
  if (vehicle === VEHICLE_TYPE.motorcycle) return true;
  if (HEAVY_VEHICLES.includes(vehicle)) {
    return license === LICENSE_TYPE.medium || license === LICENSE_TYPE.heavy;
  }
  return license !== LICENSE_TYPE.motorcycle;
}

/* ══════════════════════════════════════════════════════════════
   4 · JOB ER PROKASHSHO GHOR GULO
   Malik er nam-phone, purno thikana, gari r number - EI TALIKAY
   NAI, thakbe o na. Oi gulo private subdoc e (D-009).
   ══════════════════════════════════════════════════════════════ */

/** Ke driver khujchen - jachai er dhoron ei ta diye thik hoy */
export const EMPLOYER_TYPE = {
  family: 'family',
  company: 'company',
  rent_a_car: 'rent_a_car',
  ride_share: 'ride_share',
} as const;
export type EmployerType = (typeof EMPLOYER_TYPE)[keyof typeof EMPLOYER_TYPE];

export const EMPLOYER_TYPE_LABEL: Record<EmployerType, string> = {
  family: 'পরিবার / ব্যক্তিগত গাড়ি',
  company: 'কোম্পানি / অফিস',
  rent_a_car: 'রেন্ট-এ-কার',
  ride_share: 'রাইড শেয়ার (উবার, পাঠাও)',
};

/** Roj koto ghonta duty */
export const DUTY_HOURS = {
  h8: 'h8',
  h10: 'h10',
  h12: 'h12',
  flexible: 'flexible',
} as const;
export type DutyHours = (typeof DUTY_HOURS)[keyof typeof DUTY_HOURS];

export const DUTY_HOURS_LABEL: Record<DutyHours, string> = {
  h8: '৮ ঘণ্টা',
  h10: '১০ ঘণ্টা',
  h12: '১২ ঘণ্টা',
  flexible: 'প্রয়োজন অনুযায়ী',
};

/** Thaka-khawa - BD te driver er kaj e ei ta i boro prosno */
export const RESIDENCE = {
  live_in: 'live_in',
  live_out: 'live_out',
  either: 'either',
} as const;
export type Residence = (typeof RESIDENCE)[keyof typeof RESIDENCE];

export const RESIDENCE_LABEL: Record<Residence, string> = {
  live_in: 'মালিকের বাসায় থাকতে হবে',
  live_out: 'নিজের বাসা থেকে আসবেন',
  either: 'যেকোনোটি চলবে',
};

/** Beton er baire subidha - checkbox hishebe form e, card e chip hishebe */
export const BENEFIT = {
  food: 'food',
  accommodation: 'accommodation',
  overtime: 'overtime',
  bonus: 'bonus',
  mobile_bill: 'mobile_bill',
  weekly_off: 'weekly_off',
  medical: 'medical',
} as const;
export type Benefit = (typeof BENEFIT)[keyof typeof BENEFIT];

export const BENEFIT_LABEL: Record<Benefit, string> = {
  food: 'খাওয়া',
  accommodation: 'থাকার জায়গা',
  overtime: 'ওভারটাইম',
  bonus: 'ঈদ বোনাস',
  mobile_bill: 'মোবাইল বিল',
  weekly_off: 'সাপ্তাহিক ছুটি',
  medical: 'চিকিৎসা খরচ',
};

/* ══════════════════════════════════════════════════════════════
   5 · MALIK ER JACHAI - RentJagat EMPLOYER_STATUS er hubahu.
   Taka nite hobe ADMIN APPROVE ER PORE, tai `approved_unpaid`
   bole ekta alada obostha lage.
   ══════════════════════════════════════════════════════════════ */

export const EMPLOYER_STATUS = {
  /** Sudhu login koreche, kono job post kore ni */
  none: 'none',
  /** Form er majhkhane */
  draft: 'draft',
  /** Joma diyeche, admin dekhche */
  under_review: 'under_review',
  /** Admin aro tottho cheyeche */
  needs_info: 'needs_info',
  /** Admin approve koreche, kintu ekhono post fee dey ni - prokash hobe na */
  approved_unpaid: 'approved_unpaid',
  /** Taka diyeche - ekhon i asol verified malik */
  verified: 'verified',
  rejected: 'rejected',
  /** Meyad shesh - abar nobayon lagbe */
  expired: 'expired',
  banned: 'banned',
} as const;
export type EmployerStatus = (typeof EMPLOYER_STATUS)[keyof typeof EMPLOYER_STATUS];

export const EMPLOYER_STATUS_LABEL: Record<EmployerStatus, string> = {
  none: 'যাচাই শুরু হয়নি',
  draft: 'ফর্ম অসম্পূর্ণ',
  under_review: 'যাচাই চলছে',
  needs_info: 'আরও তথ্য প্রয়োজন',
  approved_unpaid: 'অনুমোদিত - ফি বাকি',
  verified: 'যাচাই করা নিয়োগকর্তা',
  rejected: 'বাতিল',
  expired: 'মেয়াদ শেষ',
  banned: 'নিষিদ্ধ',
};

/** Sudhu ei obosthay job prokashsho hoy */
export const canPublish = (s: EmployerStatus): boolean =>
  s === EMPLOYER_STATUS.verified;

/* ══════════════════════════════════════════════════════════════
   6 · CONTACT LEAD - prokashsho job e "এই কাজে আগ্রহী" chapa driver
   Malik ke janano HOY NA koyjon agrohi - admin i jogajog chalan.
   ══════════════════════════════════════════════════════════════ */

export const LEAD_STATUS = {
  new: 'new',
  called: 'called',
  /** Admin bachai talikay rekhechen - alochona cholche */
  shortlisted: 'shortlisted',
  /** Dui pokkho razi - ei driver i egiyeche */
  converted: 'converted',
  unreachable: 'unreachable',
  dropped: 'dropped',
} as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];

/**
 * "Batil" ba "apni bad porechen" lekha HOY NA. Je driver
 * egoy ni take sudhu tottho janano hoy, ray na - ar baki
 * agrohi ra KOKHONO jante paren na koyjon chilo.
 */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'নতুন',
  called: 'ফোন করা হয়েছে',
  shortlisted: 'আলোচনায় আছে',
  converted: 'ইন্টারভিউতে এগিয়েছে',
  unreachable: 'যোগাযোগ করা যায়নি',
  dropped: 'বাদ',
};

/* ══════════════════════════════════════════════════════════════
   7 · ADMIN PHONE KORAR POR - tap-uttor
   TutorJagat REVEAL_OUTCOME er hubahu: admin phone koren, protita
   phone er por ekta chap. Keu karo number pan na jotokkhon na
   dui pokkho i razi.
   ══════════════════════════════════════════════════════════════ */

export const CALL_OUTCOME = {
  no_answer: 'no_answer',
  declined: 'declined',
  /** Beton e poshay ni */
  salary_mismatch: 'salary_mismatch',
  /** License / duty / thaka r sharte mele ni */
  requirement_mismatch: 'requirement_mismatch',
  /** Interview ba trial e pochhondo hoy ni */
  trial_not_liked: 'trial_not_liked',
  /** Dui pokkho i razi - ekhon number o thikana binimoy hobe */
  agreed: 'agreed',
} as const;
export type CallOutcome = (typeof CALL_OUTCOME)[keyof typeof CALL_OUTCOME];

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  no_answer: 'ফোন ধরেননি',
  declined: 'রাজি হননি',
  salary_mismatch: 'বেতনে মেলেনি',
  requirement_mismatch: 'শর্তে মেলেনি',
  trial_not_liked: 'ট্রায়ালে পছন্দ হয়নি',
  agreed: 'দুই পক্ষই রাজি',
};

/** Ei uttor gulor por admin PORER agrohi ke dhorben */
export const shouldTryNext = (o: CallOutcome): boolean => o !== CALL_OUTCOME.agreed;

/** 'agreed' hole job dhap onboarding e jay - binimoy admin er hate */
export const isMatch = (o: CallOutcome): boolean => o === CALL_OUTCOME.agreed;

/* ══════════════════════════════════════════════════════════════
   8 · TAKA
   ══════════════════════════════════════════════════════════════ */

export const PAYMENT_KIND = {
  /** Job prokash er fee - approve er PORE neya hoy */
  job_fee: 'job_fee',
  /** Dui pokkho razi howar por number binimoy er fee - malik den */
  connection_fee: 'connection_fee',
  renewal: 'renewal',
} as const;
export type PaymentKind = (typeof PAYMENT_KIND)[keyof typeof PAYMENT_KIND];

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  job_fee: 'চাকরির পোস্ট ফি',
  connection_fee: 'যোগাযোগ ফি',
  renewal: 'নবায়ন',
};

export const PAYMENT_STATUS = {
  initiated: 'initiated',
  pending: 'pending',
  success: 'success',
  failed: 'failed',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  initiated: 'শুরু হয়েছে',
  pending: 'অপেক্ষমাণ',
  success: 'সফল',
  failed: 'ব্যর্থ',
};

/* ══════════════════════════════════════════════════════════════
   9 · ADMIN
   'owner' mane SITE er malik (Ruhul), gari r malik NA. Gari r
   malik er role hocche 'employer'. Ei duto gulale claims e power
   leak hobe (RentJagat D-012 er shikkha).
   ══════════════════════════════════════════════════════════════ */

export const ROLE = {
  user: 'user',
  /** Job post dewa gari r malik / niyogkorta */
  employer: 'employer',
  admin: 'admin',
  /** Site er malik - payment, ban, settings sudhu ini paren */
  owner: 'owner',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABEL: Record<Role, string> = {
  user: 'ব্যবহারকারী',
  employer: 'নিয়োগকর্তা',
  admin: 'অ্যাডমিন',
  owner: 'মালিক',
};

export const OWNER_ONLY_ACTION = {
  payments: 'payments',
  ban_user: 'ban_user',
  change_role: 'change_role',
  settings: 'settings',
  export_data: 'export_data',
} as const;
export type OwnerOnlyAction =
  (typeof OWNER_ONLY_ACTION)[keyof typeof OWNER_ONLY_ACTION];

export const isOwnerOnly = (role: Role): boolean => role === ROLE.owner;
export const isStaff = (role: Role): boolean =>
  role === ROLE.admin || role === ROLE.owner;

/* ══════════════════════════════════════════════════════════════
   10 · BATIL ER KARON
   ══════════════════════════════════════════════════════════════ */

/** Job batil korar karon - malik ke SMS e ei text i jabe */
export const JOB_REJECT_REASON = {
  incomplete_info: 'incomplete_info',
  fake_or_spam: 'fake_or_spam',
  duplicate: 'duplicate',
  contact_unreachable: 'contact_unreachable',
  /** Beton osombhob - 50 hajar er lobh dekhiye driver dhora scam */
  salary_unrealistic: 'salary_unrealistic',
  /** Chobi te phone number / thikana / number plate sposto - PII leak */
  contact_in_photos: 'contact_in_photos',
  inappropriate: 'inappropriate',
  other: 'other',
} as const;
export type JobRejectReason =
  (typeof JOB_REJECT_REASON)[keyof typeof JOB_REJECT_REASON];

export const JOB_REJECT_REASON_INFO: Record<
  JobRejectReason,
  { label: string; sms: string | null; canResubmit: boolean }
> = {
  incomplete_info: {
    label: 'তথ্য অসম্পূর্ণ',
    sms: 'আপনার ড্রাইভার চাই পোস্টে যথেষ্ট তথ্য নেই। সংশোধন করে আবার জমা দিন।',
    canResubmit: true,
  },
  fake_or_spam: {
    label: 'ভুয়া বা স্প্যাম',
    sms: 'আপনার পোস্টটি যাচাই করা যায়নি।',
    canResubmit: false,
  },
  duplicate: {
    label: 'পুনরাবৃত্তি',
    sms: 'এই কাজের একটি পোস্ট ইতিমধ্যে আছে।',
    canResubmit: false,
  },
  contact_unreachable: {
    label: 'যোগাযোগ করা যায়নি',
    sms: 'আপনার দেওয়া নম্বরে যোগাযোগ করা যায়নি।',
    canResubmit: true,
  },
  salary_unrealistic: {
    label: 'বেতন অবাস্তব',
    sms: 'পোস্টে দেওয়া বেতন বাস্তবসম্মত মনে হয়নি। ঠিক করে আবার জমা দিন।',
    canResubmit: true,
  },
  contact_in_photos: {
    label: 'ছবিতে নম্বর বা ঠিকানা দেখা যাচ্ছে',
    sms: 'ছবিতে ফোন নম্বর, ঠিকানা বা নম্বর প্লেট স্পষ্ট দেখা যাচ্ছে। ছবি বদলে আবার জমা দিন।',
    canResubmit: true,
  },
  inappropriate: {
    label: 'অগ্রহণযোগ্য বিষয়বস্তু',
    sms: 'আপনার পোস্ট আমাদের নীতিমালার সাথে সঙ্গতিপূর্ণ নয়।',
    canResubmit: false,
  },
  other: { label: 'অন্য কারণ', sms: null, canResubmit: true },
};

/** Malik jachai batil er karon - kagoj-potro somporkito */
export const EMPLOYER_REJECT_REASON = {
  documents_unclear: 'documents_unclear',
  name_mismatch: 'name_mismatch',
  fake_documents: 'fake_documents',
  duplicate_account: 'duplicate_account',
  /** Gari r malikana proman hoy ni - dalal shondeho */
  ownership_unproven: 'ownership_unproven',
  incomplete: 'incomplete',
} as const;
export type EmployerRejectReason =
  (typeof EMPLOYER_REJECT_REASON)[keyof typeof EMPLOYER_REJECT_REASON];

export const EMPLOYER_REJECT_REASON_INFO: Record<
  EmployerRejectReason,
  { label: string; canReapply: boolean; autoBan: boolean }
> = {
  documents_unclear: { label: 'কাগজ স্পষ্ট নয়', canReapply: true, autoBan: false },
  name_mismatch: { label: 'নাম মিলছে না', canReapply: true, autoBan: false },
  fake_documents: { label: 'জাল কাগজ', canReapply: false, autoBan: true },
  duplicate_account: { label: 'একাধিক অ্যাকাউন্ট', canReapply: false, autoBan: false },
  ownership_unproven: {
    label: 'গাড়ির মালিকানা প্রমাণ হয়নি',
    canReapply: true,
    autoBan: false,
  },
  incomplete: { label: 'ফর্ম অসম্পূর্ণ', canReapply: true, autoBan: false },
};
