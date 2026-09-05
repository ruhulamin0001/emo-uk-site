'use server';

/**
 * Login-chara action - lead o tracking.
 * Duitai IP diye rate-limited (lib/server/rate-limit.ts).
 */

import { headers } from 'next/headers';
import { clientIp, hitRateLimit } from '@/lib/server/rate-limit';
import { createLead } from '@/lib/server/leads';
import { lookupTracking, type TrackView } from '@/lib/server/tracking';
import { getPublicJobByCode } from '@/lib/server/jobs';
import { leadSchema } from '@/lib/validators/job';
import { fieldErrors } from '@/lib/validators/primitives';
import { TRACKING_ACCESS } from '@/config/business';

export interface LeadFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/* 4 ghor + note - FORM.contactLeadFieldCount. Beshi ghor = lead nosto. */
export async function sendLeadAction(
  _prev: LeadFormState,
  fd: FormData,
): Promise<LeadFormState> {
  const code = String(fd.get('trackingCode') ?? '');

  const parsed = leadSchema.safeParse({
    name: fd.get('name'),
    phone: fd.get('phone'),
    licenseType: fd.get('licenseType'),
    experienceYears: fd.get('experienceYears'),
    note: fd.get('note') || undefined,
  });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  /* Job ta SOTTI prokashsho to? Bhua id te lead jomano jabe na */
  const job = await getPublicJobByCode(code);
  if (!job) return { ok: false, message: 'কাজটি পাওয়া যায়নি' };

  const ip = clientIp(await headers());
  const res = await createLead(
    {
      jobId: job.id,
      trackingCode: String(job.trackingCode),
      name: parsed.data.name,
      phone: parsed.data.phone,
      licenseType: parsed.data.licenseType,
      experienceYears: parsed.data.experienceYears,
      note: parsed.data.note,
    },
    ip,
  );

  return res.ok
    ? { ok: true, message: 'আগ্রহ জমা হয়েছে। আমাদের টিম আপনাকে ফোন করবে।' }
    : { ok: false, message: res.message };
}

export interface TrackFormState {
  ok: boolean;
  message?: string;
  view?: TrackView;
}

export async function trackAction(_prev: TrackFormState, fd: FormData): Promise<TrackFormState> {
  const code = String(fd.get('code') ?? '');
  const phone = String(fd.get('phone') ?? '');

  /**
   * Rate limit AGE - lookup er age. Nahole gonona ta i
   * arthohin. Asol pahara obossho "code + phone duitai lage".
   */
  const ip = clientIp(await headers());
  const verdict = await hitRateLimit('track', ip, {
    perHour: TRACKING_ACCESS.attemptsPerHour,
    lockoutMinutes: TRACKING_ACCESS.lockoutMinutes,
  });
  if (!verdict.allowed) {
    return {
      ok: false,
      message: `অনেকবার চেষ্টা হয়েছে - ${verdict.retryAfterMinutes} মিনিট পর আবার করুন`,
    };
  }

  const res = await lookupTracking(code, phone);
  return res.ok ? { ok: true, view: res.view } : { ok: false, message: res.message };
}
