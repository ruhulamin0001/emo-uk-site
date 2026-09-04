'use server';

/**
 * Admin er action - PATLA wrapper, asol logic lib/server e.
 *
 * PROTITA action er prothom line porichoy jachai. Layout er
 * guard ta pata r jonno - action gulo ke ALADA kore pahara dite
 * hoy, karon action URL sorasori POST kora jay.
 */

import { revalidatePath } from 'next/cache';
import { requireOwner, requireStaff } from '@/lib/server/auth';
import {
  approveJob,
  markHiredOutside,
  rejectJob,
  requestEdit,
} from '@/lib/server/job-decisions';
import { setLeadStatus } from '@/lib/server/leads';
import { completeMatch, recordCallOutcome, shortlistLead } from '@/lib/server/matching';
import { markManuallyPaid } from '@/lib/server/payments';
import { MANUAL_PAYMENT } from '@/config/business';
import { setRole } from '@/lib/server/roles';
import { banUserByEmail, unbanUserByEmail } from '@/lib/server/moderation';
import {
  CALL_OUTCOME,
  LEAD_STATUS,
  JOB_REJECT_REASON,
  ROLE,
  type CallOutcome,
  type LeadStatus,
  type JobRejectReason,
  type Role,
} from '@/types/enums';

export interface ActionState {
  ok: boolean;
  message?: string;
}

/* ── Job review ─────────────────────────────────────────────── */

export async function approveJobAction(id: string): Promise<ActionState> {
  const actor = await requireStaff();
  const res = await approveJob(actor, id);
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${id}`);
  return res.ok ? { ok: true, message: 'অনুমোদিত - ফি এলে প্রকাশ হবে' } : res;
}

export async function rejectJobAction(id: string, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const reason = String(fd.get('reason') ?? '') as JobRejectReason;
  if (!(reason in JOB_REJECT_REASON)) {
    return { ok: false, message: 'কারণ বাছুন' };
  }
  const res = await rejectJob(actor, id, reason);
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${id}`);
  return res.ok ? { ok: true, message: 'বাতিল করা হয়েছে' } : res;
}

export async function requestEditAction(id: string, fd: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const res = await requestEdit(actor, id, String(fd.get('note') ?? ''));
  revalidatePath(`/admin/jobs/${id}`);
  return res.ok ? { ok: true, message: 'সংশোধনের জন্য পাঠানো হয়েছে' } : res;
}

/** Malik nije baire driver niye niyechen - feed theke sore jak */
export async function hiredOutsideAction(id: string): Promise<ActionState> {
  const actor = await requireStaff();
  const res = await markHiredOutside(actor, id);
  revalidatePath('/admin/jobs');
  revalidatePath(`/admin/jobs/${id}`);
  return res.ok ? { ok: true, message: 'অন্যভাবে নিয়োগ হয়েছে বলে নথিভুক্ত' } : res;
}

/* ── Lead ───────────────────────────────────────────────────── */

export async function setLeadStatusAction(leadId: string, status: string): Promise<ActionState> {
  const actor = await requireStaff();
  if (!(status in LEAD_STATUS)) return { ok: false, message: 'ভুল অবস্থা' };
  const res = await setLeadStatus(actor, leadId, status as LeadStatus);
  revalidatePath('/admin/leads');
  return res;
}

/* ── Matching desk ──────────────────────────────────────────── */

export async function shortlistLeadAction(leadId: string, jobId: string): Promise<ActionState> {
  const actor = await requireStaff();
  const res = await shortlistLead(actor, leadId);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/jobs/${jobId}`);
  return res.ok ? { ok: true, message: 'বাছাই তালিকায় তোলা হয়েছে' } : res;
}

export async function callOutcomeAction(
  leadId: string,
  jobId: string,
  outcome: string,
): Promise<ActionState> {
  const actor = await requireStaff();
  if (!(outcome in CALL_OUTCOME)) return { ok: false, message: 'ভুল উত্তর' };
  const res = await recordCallOutcome(actor, leadId, outcome as CallOutcome);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/jobs/${jobId}`);
  return res;
}

export async function completeMatchAction(jobId: string): Promise<ActionState> {
  const actor = await requireStaff();
  const res = await completeMatch(actor, jobId);
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath('/admin/jobs');
  return res.ok ? { ok: true, message: 'নিয়োগ চূড়ান্ত - সম্পন্ন' } : res;
}

/* ── Taka - SUDHU malik ─────────────────────────────────────── */

export async function markPaidAction(paymentId: string, fd: FormData): Promise<ActionState> {
  /**
   * SUDHU MALIK - admin na (niyom #9).
   *
   * "Taka peyechi" ek chape ekjon ke verified kore dey, ar
   * ekhane gateway er kono proman nai. Ei ekta kaj admin er
   * haate deya jay na.
   */
  const actor = await requireOwner();
  const note = String(fd.get('note') ?? '').trim();

  /* Note baddhotamulok, ar 4 oksor er kom hole NA. Server e o
     abar dekha hoy (markManuallyPaid) - action URL sorasori
     POST kora jay bole. */
  if (note.length < MANUAL_PAYMENT.noteMinChars) {
    return { ok: false, message: 'bKash এর লেনদেন নম্বরটি লিখুন (কমপক্ষে ৪ অক্ষর)' };
  }

  const res = await markManuallyPaid(actor, paymentId, note);
  revalidatePath('/admin/payments');
  return res.ok ? { ok: true, message: 'টাকা পাওয়া নথিভুক্ত হয়েছে' } : res;
}

/* ── Dol o ban - SUDHU malik ────────────────────────────────── */

export async function setRoleAction(fd: FormData): Promise<ActionState> {
  const actor = await requireOwner();
  const email = String(fd.get('email') ?? '');
  const role = String(fd.get('role') ?? '') as Role;
  if (!(role in ROLE)) return { ok: false, message: 'ভুল ক্ষমতা' };
  const res = await setRole(email, role, actor);
  revalidatePath('/admin/staff');
  return res;
}

export async function banAction(fd: FormData): Promise<ActionState> {
  const actor = await requireOwner();
  const res = await banUserByEmail(actor, String(fd.get('email') ?? ''));
  revalidatePath('/admin/moderation');
  return res;
}

export async function unbanAction(fd: FormData): Promise<ActionState> {
  const actor = await requireOwner();
  const res = await unbanUserByEmail(actor, String(fd.get('email') ?? ''));
  revalidatePath('/admin/moderation');
  return res;
}
