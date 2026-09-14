import 'server-only';

/**
 * Job pora - feed, card, admin er talika.
 *
 * PROKASHSHO card er ghor gulo EKTA I talika theke ashe -
 * niche `PUBLIC_CARD_FIELDS`. Notun ghor dekhate hole AGE oi
 * talikay joga korte hobe.
 *
 * Kano talika: `{ id, ...doc.data() }` chhorale bhobishshote
 * keu public doc e ekta gopon ghor rakhlei seta feed e chole
 * jeto. Talika mane ja nam kora, SUDHU ta i jay -
 * scripts/check-public.ts ei talika r private schema r moddhe
 * kono mil nai ta pahara dey.
 */

import { adminDb } from '@/lib/firebase/admin';
import {
  JOB_STAGE,
  type JobStage,
  type JobType,
  type VehicleType,
} from '@/types/enums';

/** Prokashsho card e JA JA jete pare - er baire KICHHU NA
    leadCount EI TALIKAY NAI ar thakbe o na - supply map gopon */
export const PUBLIC_CARD_FIELDS = [
  'trackingCode',
  'stage',
  'jobType',
  'vehicleType',
  'employerType',
  'salary',
  'salaryNegotiable',
  'benefits',
  'dutyHours',
  'residence',
  'licenseRequired',
  'experienceYearsMin',
  'startFrom',
  'divisionId',
  'districtId',
  'areaId',
  'description',
  'photoPaths',
] as const;

export type JobView = {
  id: string;
  createdAt: number;
  [key: string]: unknown;
};

/** Feed e ei stage gulo i dekha jay - firestore.rules er sathe EK */
export const PUBLIC_STAGES: readonly JobStage[] = [
  JOB_STAGE.published,
  JOB_STAGE.shortlisted,
  JOB_STAGE.onboarding,
  JOB_STAGE.completed,
];

function toView(doc: FirebaseFirestore.DocumentSnapshot): JobView {
  const view: JobView = {
    id: doc.id,
    createdAt: doc.get('createdAt')?.toMillis?.() ?? 0,
  };
  for (const f of PUBLIC_CARD_FIELDS) view[f] = doc.get(f) ?? null;
  return view;
}

/* ══════════════════════════════════════════════════════════════
   PROKASHSHO - feed o card
   ══════════════════════════════════════════════════════════════ */

export interface FeedFilters {
  jobType?: JobType;
  vehicleType?: VehicleType;
  districtId?: string;
  areaId?: string;
}

export async function getPublishedJobs(
  filters: FeedFilters = {},
  max = 30,
): Promise<JobView[]> {
  let q: FirebaseFirestore.Query = adminDb()
    .collection('jobs')
    .where('stage', '==', JOB_STAGE.published);

  if (filters.vehicleType) q = q.where('vehicleType', '==', filters.vehicleType);
  if (filters.jobType) q = q.where('jobType', '==', filters.jobType);
  if (filters.districtId) q = q.where('districtId', '==', filters.districtId);
  if (filters.areaId) q = q.where('areaId', '==', filters.areaId);

  const snap = await q.orderBy('createdAt', 'desc').limit(max).get();
  return snap.docs.map(toView);
}

/** Card er pata - code diye. Sudhu prokashsho stage e mile. */
export async function getPublicJobByCode(code: string): Promise<JobView | null> {
  const snap = await adminDb()
    .collection('jobs')
    .where('trackingCode', '==', code.trim().toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];

  const stage = doc.get('stage') as JobStage;
  if (!PUBLIC_STAGES.includes(stage)) return null;

  return toView(doc);
}

/* ══════════════════════════════════════════════════════════════
   NIJER GULO - dashboard
   Ek malik er EKADHIK gari / ekadhik post - tai talika, ekta na.
   ══════════════════════════════════════════════════════════════ */

/** Malik nijer post gulo dekhben - stage jai hok.
    leadCount ekhane NAI - malik janle beton komaben ba admin ke
    bypass korben. Tottho ta admin er astra. */
export async function getOwnJobs(
  uid: string,
  max = 20,
): Promise<(JobView & { rejectReason: string | null; awaitingFee: boolean })[]> {
  const snap = await adminDb()
    .collection('jobs')
    .where('createdBy', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(max)
    .get();

  return snap.docs.map((doc) => ({
    ...toView(doc),
    rejectReason: (doc.get('rejectReason') as string | null) ?? null,
    /* Admin approve kore diyechen, taka ekhono ashe ni - dashboard e
       "ফি দিন" button ei flag e i jage */
    awaitingFee:
      doc.get('stage') === JOB_STAGE.pending && Boolean(doc.get('approvedAt')),
  }));
}

/* ══════════════════════════════════════════════════════════════
   ADMIN - talika o purno detail (gopon ghor soho)
   Ei function gulo daka SUDHU requireStaff er porei jay.
   ══════════════════════════════════════════════════════════════ */

export interface AdminJobRow extends JobView {
  leadCount: number;
  source: string;
  createdBy: string;
}

export async function listJobsByStage(
  stage: JobStage | 'rejected' | 'needs_edit',
  max = 50,
): Promise<AdminJobRow[]> {
  const snap = await adminDb()
    .collection('jobs')
    .where('stage', '==', stage)
    .orderBy('createdAt', 'desc')
    .limit(max)
    .get();

  return snap.docs.map((d) => ({
    ...toView(d),
    leadCount: Number(d.get('leadCount') ?? 0),
    source: String(d.get('source') ?? ''),
    createdBy: String(d.get('createdBy') ?? ''),
  }));
}

export interface JobPrivateView {
  employerName: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  fullAddress: string;
  landmark: string | null;
  vehicleRegNo: string | null;
}

/** Admin er purno pata - public + GOPON ghor ek shathe */
export async function getJobForAdmin(id: string): Promise<{
  view: AdminJobRow;
  priv: JobPrivateView | null;
} | null> {
  const ref = adminDb().collection('jobs').doc(id);
  const [doc, privDoc] = await Promise.all([
    ref.get(),
    ref.collection('private').doc('contact').get(),
  ]);

  if (!doc.exists) return null;

  return {
    view: {
      ...toView(doc),
      leadCount: Number(doc.get('leadCount') ?? 0),
      source: String(doc.get('source') ?? ''),
      createdBy: String(doc.get('createdBy') ?? ''),
    },
    priv: privDoc.exists ? (privDoc.data() as JobPrivateView) : null,
  };
}

/* ══════════════════════════════════════════════════════════════
   GONONA - admin dashboard o homepage
   SOTTI gone dekha hoy (`count()`), alada counter doc na.
   ══════════════════════════════════════════════════════════════ */

export async function countByStage(stage: JobStage): Promise<number> {
  const agg = await adminDb()
    .collection('jobs')
    .where('stage', '==', stage)
    .count()
    .get();
  return agg.data().count;
}
