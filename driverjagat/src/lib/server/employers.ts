import 'server-only';

/**
 * Malik / niyogkorta - account, phone-dabi, job joma.
 *
 * EK PHONE, EK MALIK. `employer_phones/{phone}` collection ta
 * ei niyom er pahara. Ban howa keu notun Google account khule
 * abar ashle purono number ta i take dhore.
 *
 * Ek account e EKADHIK job post kora jay - "apnar ekta joma ache"
 * check ekhane NAI. Din e koyta joma jay seta settings er
 * submissionsPerPhonePerDay (rate-limit) e atke.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { createJob } from './create-job';
import { writeLog } from './activity-log';
import { EMPLOYER_STATUS, type EmployerStatus } from '@/types/enums';
import type { JobIntake } from '@/lib/validators/job';
import type { Session } from './session';

export interface UserDoc {
  employerStatus: EmployerStatus;
  name: string;
  phone: string | null;
}

export const userRef = (uid: string) => adminDb().collection('users').doc(uid);

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await userRef(uid).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export type SubmitResult =
  | { ok: true; jobId: string; trackingCode: string }
  | { ok: false; message: string };

/**
 * Malik er nijer joma.
 *
 * Phone dabi ta job toirir AGE hoy, transaction e.
 * Pore korle duijon ek shathe joma dile duita account ek
 * number e boshe jeto - ar ban er jal ta chhire jeto.
 */
export async function submitJob(
  session: Session,
  intake: JobIntake,
  photoPaths: string[] = [],
): Promise<SubmitResult> {
  const db = adminDb();
  const phone = intake.private.phone;

  /* ── Phone dabi - transaction e, jate race na hoy ── */
  const phoneRef = db.collection('employer_phones').doc(phone);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(phoneRef);
    const holder = snap.get('uid') as string | undefined;
    if (holder && holder !== session.uid) return false;
    tx.set(phoneRef, { uid: session.uid, claimedAt: FieldValue.serverTimestamp() });
    return true;
  });

  if (!claimed) {
    /**
     * "Ei number onno account e ache" BOLA HOY NA.
     * Bolle keu number bosiye bosiye dekhte parto kon number er
     * account ache - ar ban-khaowa dalal bujhe jeto kon number
     * ta purono account e dhora.
     */
    return { ok: false, message: 'এই তথ্য দিয়ে জমা দেওয়া যাচ্ছে না - আমাদের সাথে যোগাযোগ করুন' };
  }

  const created = await createJob(intake, { uid: session.uid, source: 'employer' }, photoPaths);

  /* Age theke verified malik notun post dile status verified I
     thake - abar jachai e namano hoy na. Sudhu notun account
     under_review e dhoke. */
  const existing = await getUser(session.uid);
  const nextStatus =
    existing?.employerStatus === EMPLOYER_STATUS.verified
      ? EMPLOYER_STATUS.verified
      : EMPLOYER_STATUS.under_review;

  await userRef(session.uid).set(
    {
      employerStatus: nextStatus,
      name: intake.private.employerName,
      phone,
      email: session.email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeLog(session, {
    action: 'employer.submit',
    targetId: created.id,
    note: created.trackingCode,
  });

  return { ok: true, jobId: created.id, trackingCode: created.trackingCode };
}
