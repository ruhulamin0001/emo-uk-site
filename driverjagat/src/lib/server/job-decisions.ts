import 'server-only';

/**
 * Admin er siddhanto - approve, batil, songshodhon.
 *
 * Stage bodlanor SOB rasta ei file e (ar payment er
 * `applyPaidEffect` - seta publish kore taka ashar por).
 * Onno kothao stage lekha JABE NA - ek jaygay thakle "ke
 * kothay flip korlo" prosno ta kokhono uthbe na.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { writeLog } from './activity-log';
import { userRef } from './employers';
import {
  EMPLOYER_STATUS,
  JOB_CLOSED_STATE,
  JOB_REJECT_REASON_INFO,
  JOB_STAGE,
  type JobRejectReason,
} from '@/types/enums';
import type { Session } from './session';

export type DecisionResult = { ok: true } | { ok: false; message: string };

const jobRef = (id: string) => adminDb().collection('jobs').doc(id);

/**
 * Approve - kintu PROKASH NA.
 *
 * Taka ashar AGE kichhu prokashsho hoy na. Ekhane sudhu:
 *   • job e `approvedAt` boshe (payment er por publish er shorto)
 *   • malik `approved_unpaid` hon - dashboard e "fee din" dekhen
 *     (age theke i verified hole status ta verified i thake)
 * Prokash ta ghote lib/server/payments.ts er transaction e.
 */
export async function approveJob(actor: Session, jobId: string): Promise<DecisionResult> {
  const ref = jobRef(jobId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  if (snap.get('stage') !== JOB_STAGE.pending) {
    return { ok: false, message: 'এই কাজ অপেক্ষমাণ অবস্থায় নেই' };
  }

  const employerUid = String(snap.get('createdBy'));

  await ref.update({
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: actor.uid,
    rejectReason: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  /* Ek malik er EKADHIK post - age theke verified thakle take
     abar approved_unpaid e namano hoy NA. Notun post er fee ta
     payment page e alada kore i dekha jay. */
  const user = await userRef(employerUid).get();
  const status = user.exists ? String(user.get('employerStatus')) : undefined;
  if (status !== EMPLOYER_STATUS.verified) {
    await userRef(employerUid).set(
      {
        employerStatus: EMPLOYER_STATUS.approved_unpaid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await writeLog(actor, {
    action: 'job.approve',
    targetId: jobId,
    changes: { stage: ['pending', 'approved (fee baki)'] },
  });

  return { ok: true };
}

export async function rejectJob(
  actor: Session,
  jobId: string,
  reason: JobRejectReason,
): Promise<DecisionResult> {
  const ref = jobRef(jobId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  const before = String(snap.get('stage'));
  const info = JOB_REJECT_REASON_INFO[reason];

  await ref.update({
    stage: JOB_CLOSED_STATE.rejected,
    rejectReason: reason,
    rejectedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  /* Account er status sudhu tokhon i namano hoy jokhon tar
     ONNO kono cholti post nai - ek post batil hole verified
     malik er baki post gulo to thik i ache. */
  const employerUid = String(snap.get('createdBy'));
  const others = await adminDb()
    .collection('jobs')
    .where('createdBy', '==', employerUid)
    .where('stage', 'in', [JOB_STAGE.published, JOB_STAGE.shortlisted, JOB_STAGE.onboarding])
    .limit(1)
    .get();
  if (others.empty) {
    await userRef(employerUid).set(
      {
        employerStatus: EMPLOYER_STATUS.rejected,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await writeLog(actor, {
    action: 'job.reject',
    targetId: jobId,
    changes: { stage: [before, 'rejected'] },
    note: `${reason}${info.canResubmit ? '' : ' (abar joma jabe na)'}`,
  });

  return { ok: true };
}

/** "Aro tottho lagbe" - malik songshodhon kore abar joma diten */
export async function requestEdit(
  actor: Session,
  jobId: string,
  note: string,
): Promise<DecisionResult> {
  const ref = jobRef(jobId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  await ref.update({
    stage: JOB_CLOSED_STATE.needs_edit,
    editNote: note || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await userRef(String(snap.get('createdBy'))).set(
    {
      employerStatus: EMPLOYER_STATUS.needs_info,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeLog(actor, {
    action: 'job.request_edit',
    targetId: jobId,
    note,
  });

  return { ok: true };
}

/**
 * Driver PEYE GECHEN - kintu amader match e na, malik nije niyechen.
 * Feed theke soriye dei jate stale post na thake (D-005 er attha).
 */
export async function markHiredOutside(
  actor: Session,
  jobId: string,
): Promise<DecisionResult> {
  const ref = jobRef(jobId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  const before = String(snap.get('stage'));
  await ref.update({
    stage: JOB_CLOSED_STATE.hired_outside,
    closedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeLog(actor, {
    action: 'job.hired_outside',
    targetId: jobId,
    changes: { stage: [before, 'hired_outside'] },
  });

  return { ok: true };
}
