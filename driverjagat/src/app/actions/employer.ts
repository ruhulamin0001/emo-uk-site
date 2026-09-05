'use server';

/**
 * Malik er action - PATLA wrapper. Asol logic lib/server e.
 * Protita action er PROTHOM kaj: porichoy jachai.
 */

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/server/auth';
import { getUser, submitJob } from '@/lib/server/employers';
import { startPayment } from '@/lib/server/payments';
import { jobIntakeSchema } from '@/lib/validators/job';
import { fieldErrors } from '@/lib/validators/primitives';
import { JOB } from '@/config/business';
import { PAYMENT_KIND } from '@/types/enums';
import { siteConfig } from '@/config/site';
import { adminDb } from '@/lib/firebase/admin';

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  trackingCode?: string;
}

const str = (fd: FormData, k: string): string | undefined => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
};

export async function submitJobAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await requireAuth().catch(() => null);
  if (!session) return { ok: false, message: 'আগে লগইন করুন' };

  const raw = {
    public: {
      jobType: str(fd, 'jobType'),
      vehicleType: str(fd, 'vehicleType'),
      employerType: str(fd, 'employerType'),
      salary: str(fd, 'salary'),
      salaryNegotiable: fd.get('salaryNegotiable') === 'on',
      benefits: fd.getAll('benefits').filter((v) => typeof v === 'string'),
      dutyHours: str(fd, 'dutyHours'),
      residence: str(fd, 'residence'),
      licenseRequired: str(fd, 'licenseRequired'),
      experienceYearsMin: str(fd, 'experienceYearsMin') ?? '0',
      startFrom: str(fd, 'startFrom'),
      divisionId: str(fd, 'divisionId'),
      districtId: str(fd, 'districtId'),
      areaId: str(fd, 'areaId'),
      description: str(fd, 'description'),
    },
    private: {
      employerName: str(fd, 'employerName'),
      phone: str(fd, 'phone'),
      altPhone: str(fd, 'altPhone'),
      email: str(fd, 'email') ?? '',
      fullAddress: str(fd, 'fullAddress'),
      landmark: str(fd, 'landmark'),
      vehicleRegNo: str(fd, 'vehicleRegNo'),
    },
  };

  const parsed = jobIntakeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'কিছু ঘর ঠিক করা দরকার',
      errors: fieldErrors(parsed.error),
    };
  }

  /**
   * Chobi - upload page e AGE Storage e uthe, ekhane sudhu
   * path ashe. Path gulo JACHAI kora hoy:
   *   • Nijer folder er i to? (`job_photos/<uid>/`) - onno
   *     karo chobi nijer post e bosano jabe na.
   *   • Gathon ta amader banano nam er moto to? - `../` jatiyo
   *     kono khela jabe na.
   * Chobi OICHHIK (D-008) - minPhotos 0, kintu dile sorbocho maxPhotos.
   */
  const prefix = `job_photos/${session.uid}/`;
  const photoPaths = fd
    .getAll('photoPaths')
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .map((v) => v.trim());

  const validPath = (p: string): boolean =>
    p.startsWith(prefix) && /^[a-z0-9_/.-]+\.jpg$/i.test(p) && !p.includes('..');

  if (photoPaths.length < JOB.minPhotos) {
    return {
      ok: false,
      message: `গাড়ির অন্তত ${JOB.minPhotos}টি ছবি দিন`,
      errors: { photoPaths: `অন্তত ${JOB.minPhotos}টি ছবি লাগবে` },
    };
  }
  if (photoPaths.length > JOB.maxPhotos || !photoPaths.every(validPath)) {
    return { ok: false, message: 'ছবিগুলো ঠিকমতো আপলোড হয়নি - আবার চেষ্টা করুন' };
  }

  const res = await submitJob(session, parsed.data, photoPaths);
  if (!res.ok) return { ok: false, message: res.message };

  return {
    ok: true,
    message: 'ড্রাইভার চাই পোস্ট জমা হয়েছে। অ্যাডমিন যাচাই করে আপনাকে জানাবেন।',
    trackingCode: res.trackingCode,
  };
}

/** Dashboard er "ফি দিন" button - KON post er fee ta soho */
export async function startJobPaymentAction(jobId: string): Promise<void> {
  const session = await requireAuth();
  const user = await getUser(session.uid);
  if (!user) redirect('/dashboard');

  /* Nijer post er fee i to? Onno karo post er id pathiye tar
     hoye taka dewa nirdosh, kintu bhul post publish hoye jawa
     nirdosh na - tai malikana check. */
  const snap = await adminDb().collection('jobs').doc(jobId).get();
  if (!snap.exists || snap.get('createdBy') !== session.uid) {
    redirect('/dashboard');
  }

  const res = await startPayment({
    userId: session.uid,
    name: user.name,
    phone: user.phone ?? '',
    email: session.email ?? undefined,
    kind: PAYMENT_KIND.job_fee,
    jobId,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url,
  });

  if (res.ok) redirect(res.redirectUrl);
  redirect('/dashboard?payment_error=1');
}
