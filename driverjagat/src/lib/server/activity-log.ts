import 'server-only';

/**
 * Audit log - CLAUDE.md niyom #14
 *
 * Protita privileged kaj e ekta line. Ekbar likha hole
 * KOKHONO bodlano ba mucha jabe na - firestore.rules e
 * update o delete duitai bondho.
 *
 * Puro document rakha hoy NA - sudhu JA BODLECHE ta.
 * Purota rakhle chhoy mash e storage er kharcha berie jabe.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { Session } from './auth';

export type AuditAction =
  | 'job.create'
  | 'job.approve'
  | 'job.reject'
  | 'job.edit'
  | 'job.request_edit'
  | 'job.hired_outside'
  | 'job.complete'
  | 'lead.create'
  | 'lead.call'
  | 'lead.shortlist'
  | 'lead.call_outcome'
  /** Dui pokkho razi - admin number binimoy korlen. Kar number ke pelo. */
  | 'lead.match'
  | 'employer.verify'
  | 'employer.reject'
  | 'employer.request_info'
  | 'employer.submit'
  /**
   * Number bodlano ALADA kore lekha hoy.
   *
   * Eta sadharon kaj na. Keu jachai hoye jawar por number
   * bodlacchen mane - hoy sotti SIM hariyeche, noy onno kichhu.
   * Ek jaygay dekhte parle admin dhorte parben.
   */
  | 'employer.phone_change'
  | 'user.ban'
  /** Fire anar poth o LEKHA thake - ke tullo, kokhon */
  | 'user.unban'
  | 'user.role_change'
  | 'payment.start'
  /**
   * Admin haate haate "taka peyechi" bollen.
   *
   * Ei ta ALADA kore lekha hoy, karon ekhane kono gateway er
   * proman nai - sudhu ekjon manuser kotha. Pore hisheb na
   * milleI ei log ta i ekmatro suto.
   */
  | 'payment.manual_settle'
  /**
   * Atke thaka taka malik "dekhechi" bole sari theke namalen.
   *
   * Onko na mila, ferot deya, ba age-taka-pore-approve - ei
   * gulo r sesh siddhanto ekjon manuser. Kon nothi, koto taka,
   * keno atkechilo ar KI kora holo - sob ek line e.
   */
  | 'payment.attention_cleared'
  | 'payment.refund'
  | 'settings.update';

export interface AuditEntry {
  action: AuditAction;
  targetId: string;
  /** Sudhu ja bodleche - { stage: ['pending', 'published'] } */
  changes?: Record<string, [unknown, unknown]>;
  note?: string;
}

export async function writeLog(
  actor: Session,
  entry: AuditEntry,
): Promise<void> {
  await adminDb().collection('activity_logs').add({
    action: entry.action,
    targetId: entry.targetId,
    actorId: actor.uid,
    actorName: actor.name,
    actorRole: actor.role,
    changes: entry.changes ?? null,
    note: entry.note ?? null,
    at: FieldValue.serverTimestamp(),
  });
}
