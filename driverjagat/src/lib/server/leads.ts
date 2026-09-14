import 'server-only';

/**
 * Contact lead - prokashsho job card e "এই কাজে আগ্রহী" chapa driver.
 *
 * Malik KOKHONO jante paren na ke agroho dekhalo, ba KOYJON
 * dekhalo. Lead sudhu admin dekhen, admin i phone koren.
 * Ei ta i admin-mediated wada - malik agrohi der sonkha janle
 * beton komaben ba soja bypass korben.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { writeLog } from './activity-log';
import { hitRateLimit } from './rate-limit';
import { LEAD_STATUS, LICENSE_TYPE, type LeadStatus, type LicenseType } from '@/types/enums';
import type { Session } from './session';

const leadsCol = () => adminDb().collection('contact_leads');

export type LeadResult = { ok: true } | { ok: false; message: string };

export interface NewLead {
  jobId: string;
  trackingCode: string;
  name: string;
  phone: string;
  /** Driver er nijer license - admin er prothom chhakni */
  licenseType: LicenseType;
  experienceYears: number;
  note?: string;
}

/**
 * Prokashsho form theke - login LAGE NA (driver der email account
 * thakar kotha na, demand side e friction o na). Tai IP diye
 * rate limit.
 */
export async function createLead(d: NewLead, ip: string): Promise<LeadResult> {
  /* Ghontay 5 ta i onek - ekjon driver er ekta kaj e ekta i agroho */
  const verdict = await hitRateLimit('lead', ip, { perHour: 5, lockoutMinutes: 60 });
  if (!verdict.allowed) {
    return { ok: false, message: 'অনেকবার চেষ্টা হয়েছে - কিছুক্ষণ পর আবার করুন' };
  }

  const batch = adminDb().batch();
  batch.set(leadsCol().doc(), {
    jobId: d.jobId,
    trackingCode: d.trackingCode,
    name: d.name,
    phone: d.phone,
    licenseType: d.licenseType,
    experienceYears: d.experienceYears,
    note: d.note ?? null,
    status: LEAD_STATUS.new,
    createdAt: FieldValue.serverTimestamp(),
  });
  /* leadCount ADMIN er chokh - job card e KOKHONO jabe na
     (PUBLIC_CARD_FIELDS e nai, tai jete o pare na) */
  batch.update(adminDb().collection('jobs').doc(d.jobId), {
    leadCount: FieldValue.increment(1),
  });
  await batch.commit();

  return { ok: true };
}

export interface LeadRow {
  id: string;
  jobId: string;
  trackingCode: string;
  name: string;
  phone: string;
  licenseType: LicenseType;
  experienceYears: number;
  note: string | null;
  status: LeadStatus;
  createdAt: number;
}

function toRow(d: FirebaseFirestore.QueryDocumentSnapshot): LeadRow {
  return {
    id: d.id,
    jobId: String(d.get('jobId') ?? ''),
    trackingCode: String(d.get('trackingCode') ?? ''),
    name: String(d.get('name') ?? ''),
    phone: String(d.get('phone') ?? ''),
    licenseType: (d.get('licenseType') as LicenseType) ?? LICENSE_TYPE.light,
    experienceYears: Number(d.get('experienceYears') ?? 0),
    note: (d.get('note') as string | null) ?? null,
    status: (d.get('status') as LeadStatus) ?? LEAD_STATUS.new,
    createdAt: d.get('createdAt')?.toMillis?.() ?? 0,
  };
}

export async function listLeads(status?: LeadStatus, max = 50): Promise<LeadRow[]> {
  let q: FirebaseFirestore.Query = leadsCol();
  if (status) q = q.where('status', '==', status);

  const snap = await q.orderBy('createdAt', 'desc').limit(max).get();
  return snap.docs.map(toRow);
}

/** Matching desk - ekta job er sob lead, admin job patay */
export async function listLeadsForJob(jobId: string, max = 50): Promise<LeadRow[]> {
  const snap = await leadsCol()
    .where('jobId', '==', jobId)
    .orderBy('createdAt', 'desc')
    .limit(max)
    .get();
  return snap.docs.map(toRow);
}

/** Kiu er sonkha - SOTTI gone (`count()`), counter doc na */
export async function countNewLeads(): Promise<number> {
  const agg = await leadsCol().where('status', '==', LEAD_STATUS.new).count().get();
  return agg.data().count;
}

export async function setLeadStatus(
  actor: Session,
  leadId: string,
  status: LeadStatus,
): Promise<LeadResult> {
  const ref = leadsCol().doc(leadId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'লিড পাওয়া যায়নি' };

  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });

  await writeLog(actor, {
    action: 'lead.call',
    targetId: leadId,
    changes: { status: [String(snap.get('status')), status] },
  });

  return { ok: true };
}
