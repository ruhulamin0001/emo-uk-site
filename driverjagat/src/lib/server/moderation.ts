import 'server-only';

/**
 * Ban / unban - SUDHU malik.
 *
 * Database e `banned: true` lekha JOTHESTO NA. Session cookie
 * login er muhurter claim niye 14 din boidho thake. Tai DUITA
 * kaj ek shathe:
 *   1. custom claim e `banned: true`
 *   2. `revokeRefreshTokens` - purono cookie EKHON i more
 * `readSession()` er `verifySessionCookie(raw, true)` er oi
 * `true` ta i revocation ta dhore.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { writeLog } from './activity-log';
import { EMPLOYER_STATUS, JOB_CLOSED_STATE } from '@/types/enums';
import type { Session } from './session';

export type ModerationResult = { ok: true; message: string } | { ok: false; message: string };

export async function banUserByEmail(
  actor: Session,
  email: string,
): Promise<ModerationResult> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, message: 'ইমেইল দিন' };

  let user;
  try {
    user = await adminAuth().getUserByEmail(clean);
  } catch {
    return { ok: false, message: 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই' };
  }

  if (user.uid === actor.uid) {
    return { ok: false, message: 'নিজেকে নিষিদ্ধ করা যায় না' };
  }

  const existing = (user.customClaims ?? {}) as Record<string, unknown>;

  /* 1 - claim: ei ta i asol tala */
  await adminAuth().setCustomUserClaims(user.uid, { ...existing, banned: true });
  /* 2 - purono cookie EKHON i more */
  await adminAuth().revokeRefreshTokens(user.uid);

  const db = adminDb();
  const userRef = db.collection('users').doc(user.uid);
  const userSnap = await userRef.get();

  const statusBefore = (userSnap.get('employerStatus') as string | undefined) ?? 'none';

  const batch = db.batch();

  /* Bhul ban FERANO jay - tai ager obostha ta likhe rakha hoy */
  batch.set(
    userRef,
    {
      employerStatus: EMPLOYER_STATUS.banned,
      statusBeforeBan: statusBefore,
      bannedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  /**
   * SOB job feed theke sore jay - MarriageJagat e ekta
   * biodata chilo, ekhane ekta account er EKADHIK job.
   * Protita r ager stage ta likhe rakha hoy jate bhul ban
   * ferale admin haate haate ferate paren.
   */
  const jobs = await db
    .collection('jobs')
    .where('createdBy', '==', user.uid)
    .get();
  for (const l of jobs.docs) {
    const stage = String(l.get('stage'));
    if (stage === JOB_CLOSED_STATE.cancelled) continue;
    batch.update(l.ref, {
      stage: JOB_CLOSED_STATE.cancelled,
      stageBeforeBan: stage,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  await writeLog(actor, {
    action: 'user.ban',
    targetId: user.uid,
    changes: { employerStatus: [statusBefore, 'banned'] },
    note: clean,
  });

  /**
   * Banned manush ke KONO barta jay na - icchakrito.
   * Login korte giye parben na, etuku i. Kon signal e dhora
   * porlen ta janle porer bar seta i eriye asten.
   */
  return { ok: true, message: 'নিষিদ্ধ করা হয়েছে' };
}

export async function unbanUserByEmail(
  actor: Session,
  email: string,
): Promise<ModerationResult> {
  const clean = email.trim().toLowerCase();

  let user;
  try {
    user = await adminAuth().getUserByEmail(clean);
  } catch {
    return { ok: false, message: 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই' };
  }

  const existing = (user.customClaims ?? {}) as Record<string, unknown>;
  await adminAuth().setCustomUserClaims(user.uid, { ...existing, banned: false });
  await adminAuth().revokeRefreshTokens(user.uid);

  const userRef = adminDb().collection('users').doc(user.uid);
  const snap = await userRef.get();
  const statusBefore = (snap.get('statusBeforeBan') as string | undefined) ?? 'none';

  /* Thik AGER obosthay fire jan - notun kore jachai lage na */
  await userRef.set(
    {
      employerStatus: statusBefore,
      statusBeforeBan: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await writeLog(actor, {
    action: 'user.unban',
    targetId: user.uid,
    changes: { employerStatus: ['banned', statusBefore] },
    note: clean,
  });

  return { ok: true, message: 'নিষেধাজ্ঞা তোলা হয়েছে - পোস্টগুলো লাগলে আলাদাভাবে ফেরান' };
}
