import 'server-only';

/**
 * Matching desk - admin er haat. Ekhane prostab nai, LEAD i sob
 * (driver card e "আগ্রহী" chape, admin phone kore).
 *
 * TIN TA niyom, TutorJagat theke hubuhu:
 *   1. Keu karo number pan na - ADMIN phone koren.
 *   2. SUDHU 'agreed' hole number-thikana binimoy hoy, ar seta o
 *      admin er haate (private/match doc e lekha thake).
 *   3. Bad pora driver ra KOKHONO jante paren na tader kotha
 *      bhaba hoyechilo - kono barta jay na.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { writeLog } from './activity-log';
import {
  CALL_OUTCOME,
  LEAD_STATUS,
  JOB_STAGE,
  isMatch,
  type CallOutcome,
} from '@/types/enums';
import type { Session } from './session';

export type MatchResult = { ok: true } | { ok: false; message: string };

const leadRef = (id: string) => adminDb().collection('contact_leads').doc(id);
const jobRef = (id: string) => adminDb().collection('jobs').doc(id);

/**
 * Lead ke bachai talikay tola - job tokhon `shortlisted` dhap e.
 */
export async function shortlistLead(actor: Session, leadId: string): Promise<MatchResult> {
  const snap = await leadRef(leadId).get();
  if (!snap.exists) return { ok: false, message: 'লিড পাওয়া যায়নি' };

  const jobId = String(snap.get('jobId'));
  const job = await jobRef(jobId).get();
  if (!job.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  const stage = String(job.get('stage'));
  if (stage !== JOB_STAGE.published && stage !== JOB_STAGE.shortlisted) {
    return { ok: false, message: 'এই কাজ এখন বাছাইয়ের অবস্থায় নেই' };
  }

  const batch = adminDb().batch();
  batch.update(leadRef(leadId), {
    status: LEAD_STATUS.shortlisted,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (stage === JOB_STAGE.published) {
    batch.update(jobRef(jobId), {
      stage: JOB_STAGE.shortlisted,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  await writeLog(actor, { action: 'lead.shortlist', targetId: leadId });
  return { ok: true };
}

/**
 * Phone er por tap-uttor.
 *
 * 'agreed' hole i SUDHU match ghote: job `onboarding` e jay ar
 * driver er nam-number job er private/match doc e boshe - malik
 * pore tracking page eo eta i dekhen. Onno sob uttor e lead ta
 * sore jay, job shortlisted e i thake - admin porer lead dhoren.
 */
export async function recordCallOutcome(
  actor: Session,
  leadId: string,
  outcome: CallOutcome,
): Promise<MatchResult> {
  const snap = await leadRef(leadId).get();
  if (!snap.exists) return { ok: false, message: 'লিড পাওয়া যায়নি' };

  const jobId = String(snap.get('jobId'));

  if (!isMatch(outcome)) {
    await leadRef(leadId).update({
      callOutcome: outcome,
      status:
        outcome === CALL_OUTCOME.no_answer ? LEAD_STATUS.called : LEAD_STATUS.dropped,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeLog(actor, {
      action: 'lead.call_outcome',
      targetId: leadId,
      note: outcome,
    });
    return { ok: true };
  }

  /* ── agreed - dui pokkho razi ── */
  const batch = adminDb().batch();
  batch.update(leadRef(leadId), {
    callOutcome: outcome,
    status: LEAD_STATUS.converted,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(jobRef(jobId), {
    stage: JOB_STAGE.onboarding,
    updatedAt: FieldValue.serverTimestamp(),
  });
  /**
   * Number binimoy er NOTHI - browser theke keu porte pare na
   * (private subcollection, rules e bondho). Admin phone e i
   * binimoy koran; eta sudhu pore dekhbar record, ar tracking
   * page er matchedContact er utso.
   */
  batch.set(jobRef(jobId).collection('private').doc('match'), {
    leadId,
    driverName: String(snap.get('name') ?? ''),
    driverPhone: String(snap.get('phone') ?? ''),
    matchedAt: FieldValue.serverTimestamp(),
    matchedBy: actor.uid,
  });
  await batch.commit();

  await writeLog(actor, {
    action: 'lead.match',
    targetId: leadId,
    changes: { stage: ['shortlisted', 'onboarding'] },
  });
  return { ok: true };
}

/**
 * Niyog CHURANTO - job `completed`. Connection fee er hisheb
 * admin payments page e alada kore dekhen (auto katha nai -
 * manual bKash path, D-002).
 */
export async function completeMatch(actor: Session, jobId: string): Promise<MatchResult> {
  const snap = await jobRef(jobId).get();
  if (!snap.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  if (snap.get('stage') !== JOB_STAGE.onboarding) {
    return { ok: false, message: 'কাজটি এখনো ইন্টারভিউর ধাপে যায়নি' };
  }

  await jobRef(jobId).update({
    stage: JOB_STAGE.completed,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeLog(actor, {
    action: 'job.complete',
    targetId: jobId,
    changes: { stage: ['onboarding', 'completed'] },
  });
  return { ok: true };
}
