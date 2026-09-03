/**
 * Puro babshar jibonchokro - EK script e, emulator er upor.
 *
 *   npm run emulator     (alada terminal)
 *   npm run e2e
 *
 * submit → approve → taka → publish → lead → shortlist →
 * agreed (number binimoy) → complete - protita dhap e assert.
 *
 * Ei script lib/server er ASOL function gulo daake - mane
 * jeta production e cholbe seta i porikkha hoy, nokol na.
 */

import { adminDb, isEmulator } from '../src/lib/firebase/admin';
import { submitJob, getUser } from '../src/lib/server/employers';
import {
  getOwnJobs,
  getPublicJobByCode,
  getPublishedJobs,
  getJobForAdmin,
} from '../src/lib/server/jobs';
import { approveJob } from '../src/lib/server/job-decisions';
import { markManuallyPaid, startPayment, getPaymentsFor } from '../src/lib/server/payments';
import { createLead, listLeadsForJob } from '../src/lib/server/leads';
import { completeMatch, recordCallOutcome, shortlistLead } from '../src/lib/server/matching';
import { lookupTracking } from '../src/lib/server/tracking';
import { jobIntakeSchema } from '../src/lib/validators/job';
import {
  CALL_OUTCOME,
  EMPLOYER_STATUS,
  LEAD_STATUS,
  LICENSE_TYPE,
  JOB_STAGE,
  PAYMENT_KIND,
  ROLE,
} from '../src/types/enums';
import { areas, districts } from '../src/data/locations';
import type { Session } from '../src/lib/server/session';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? ' - ' + extra : ''}`);
};

const employer: Session = {
  uid: 'e2e-employer',
  email: 'employer@e2e.test',
  name: 'ই২ই মালিক',
  role: ROLE.employer,
  employerStatus: EMPLOYER_STATUS.none,
  banned: false,
};

const staff: Session = {
  uid: 'e2e-admin',
  email: 'admin@e2e.test',
  name: 'ই২ই অ্যাডমিন',
  role: ROLE.owner,
  employerStatus: EMPLOYER_STATUS.none,
  banned: false,
};

async function cleanup() {
  const db = adminDb();
  for (const col of ['jobs', 'contact_leads', 'payments']) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      for (const sub of ['contact', 'match']) {
        await d.ref.collection('private').doc(sub).delete().catch(() => {});
      }
      await d.ref.delete();
    }
  }
  await db.collection('users').doc(employer.uid).delete().catch(() => {});
  await db.collection('employer_phones').doc('+8801811111111').delete().catch(() => {});
}

async function main() {
  if (!isEmulator()) {
    console.error('\n  Ei test SUDHU emulator e - asol server e na.\n');
    process.exit(1);
  }

  await cleanup();

  const dhaka = districts.find((d) => d.name === 'Dhaka')!;
  const area = areas.find((a) => a.districtId === dhaka.id)!;

  const intake = jobIntakeSchema.parse({
    public: {
      jobType: 'full_time',
      vehicleType: 'microbus',
      employerType: 'family',
      salary: 20000,
      salaryNegotiable: true,
      benefits: ['food', 'bonus'],
      dutyHours: 'h10',
      residence: 'live_out',
      licenseRequired: 'light',
      experienceYearsMin: 3,
      startFrom: '2026-10',
      divisionId: dhaka.divisionId,
      districtId: dhaka.id,
      areaId: area.id,
      description: 'সকালে স্কুল ড্রপ, বিকালে অফিস থেকে আনা',
    },
    private: {
      employerName: 'ই২ই মালিক',
      phone: '01811111111',
      email: '',
      fullAddress: 'বাড়ি ১২, রোড ৩, ব্লক বি',
      landmark: 'স্কুলের পাশে',
      vehicleRegNo: 'ঢাকা মেট্রো চ ১১-২২৩৩',
    },
  });

  console.log('\n━━ 1 · Joma ━━');
  const photoPaths = [`job_photos/${employer.uid}/photo-1-aaa.jpg`];
  const sub = await submitJob(employer, intake, photoPaths);
  ok(sub.ok, 'joma holo', sub.ok ? sub.trackingCode : sub.message);
  if (!sub.ok) return finish();
  const { jobId, trackingCode } = sub;

  ok(trackingCode.startsWith('DJ-'), 'code DJ- diye suru', trackingCode);
  ok((await getPublishedJobs()).length === 0, 'pending kichu i feed e NAI');
  ok((await getPublicJobByCode(trackingCode)) === null, 'pending card khola jay na');
  ok(
    (await getUser(employer.uid))?.employerStatus === EMPLOYER_STATUS.under_review,
    'malik under_review',
  );

  const admin1 = await getJobForAdmin(jobId);
  ok(admin1?.priv?.fullAddress === 'বাড়ি ১২, রোড ৩, ব্লক বি', 'admin purno thikana dekhen');
  ok(admin1?.priv?.vehicleRegNo === 'ঢাকা মেট্রো চ ১১-২২৩৩', 'admin gari r number dekhen');
  ok(admin1?.view.photoPaths !== undefined, 'chobi path public doc e');

  const noPhoto = await submitJob(employer, intake, []);
  ok(noPhoto.ok, 'chobi CHARA o joma jay (D-008: oichhik)');
  if (noPhoto.ok) {
    const ref = adminDb().collection('jobs').doc(noPhoto.jobId);
    await ref.collection('private').doc('contact').delete();
    await ref.delete();
  }

  console.log('\n━━ 2 · Approve - kintu prokash NA ━━');
  const ap = await approveJob(staff, jobId);
  ok(ap.ok, 'approve holo');
  ok((await getPublishedJobs()).length === 0, 'approve howar POR o feed faka (taka baki)');
  ok(
    (await getUser(employer.uid))?.employerStatus === EMPLOYER_STATUS.approved_unpaid,
    'malik approved_unpaid',
  );
  const own1 = await getOwnJobs(employer.uid);
  ok(own1[0]?.awaitingFee === true, 'dashboard e "ফি দিন" jagbe (awaitingFee)');
  ok(!('leadCount' in own1[0]), 'nijer talikay leadCount NAI (supply map gopon)');

  console.log('\n━━ 3 · Taka → prokash (EK transaction) ━━');
  const pay = await startPayment({
    userId: employer.uid,
    name: 'ই২ই মালিক',
    phone: '+8801811111111',
    kind: PAYMENT_KIND.job_fee,
    jobId,
    siteUrl: 'http://localhost:3000',
  });
  ok(pay.ok, 'payment suru holo (manual bKash path)');
  if (!pay.ok) return finish();

  const noJob = await startPayment({
    userId: employer.uid, name: 'x', phone: 'x',
    kind: PAYMENT_KIND.job_fee, siteUrl: 'http://x',
  });
  ok(!noJob.ok, 'jobId chhara job_fee suru i hoy na');

  const settle = await markManuallyPaid(pay.paymentId, staff.uid, 'TRX-E2E-1');
  ok(settle.ok && settle.paid, 'malik "taka peyechi" chapley settle');

  const feed = await getPublishedJobs();
  ok(feed.length === 1, 'taka + approve = EKHON feed e', String(feed.length));
  ok(feed[0]?.trackingCode === trackingCode, 'feed er card ta ei job i');
  ok(
    (await getUser(employer.uid))?.employerStatus === EMPLOYER_STATUS.verified,
    'malik ekhon verified',
  );
  const card = await getPublicJobByCode(trackingCode);
  ok(card !== null, 'card ekhon khola jay');
  ok(!('employerName' in (card ?? {})), 'card e malik er nam NAI');
  ok(!('phone' in (card ?? {})), 'card e phone NAI');
  ok(!('fullAddress' in (card ?? {})), 'card e purno thikana NAI');
  ok(!('vehicleRegNo' in (card ?? {})), 'card e gari r number NAI');
  const payments = await getPaymentsFor(employer.uid);
  ok(payments[0]?.status === 'success', 'payment nothi success');

  const again = await markManuallyPaid(pay.paymentId, staff.uid, 'TRX-E2E-1');
  ok(again.ok && again.alreadyDone, 'dwitiyo settle e kichhu ghote na (idempotent)');

  console.log('\n━━ 4 · Lead → matching desk ━━');
  const lead = await createLead(
    {
      jobId,
      trackingCode,
      name: 'ই২ই ড্রাইভার',
      phone: '+8801922222222',
      licenseType: LICENSE_TYPE.light,
      experienceYears: 5,
      note: 'অক্টোবর থেকে পারব',
    },
    '10.0.0.1',
  );
  ok(lead.ok, 'lead jomlo (guest, login chara)');
  const adminView = await getJobForAdmin(jobId);
  ok(adminView?.view.leadCount === 1, 'admin leadCount dekhen = 1');

  const leads = await listLeadsForJob(jobId);
  ok(leads.length === 1, 'matching desk e lead ta ache');
  ok(leads[0]?.licenseType === 'light' && leads[0]?.experienceYears === 5, 'lead e license o obhiggota ache');
  const leadId = leads[0].id;

  const sl = await shortlistLead(staff, leadId);
  ok(sl.ok, 'shortlist holo');
  ok((await getJobForAdmin(jobId))?.view.stage === JOB_STAGE.shortlisted, 'job dhap shortlisted');

  console.log('\n━━ 5 · Agreed → number binimoy → complete ━━');
  const outcome = await recordCallOutcome(staff, leadId, CALL_OUTCOME.agreed);
  ok(outcome.ok, 'agreed lekha holo');
  ok((await getJobForAdmin(jobId))?.view.stage === JOB_STAGE.onboarding, 'job dhap onboarding');
  ok((await listLeadsForJob(jobId))[0]?.status === LEAD_STATUS.converted, 'lead converted');

  const match = await adminDb()
    .collection('jobs').doc(jobId)
    .collection('private').doc('match').get();
  ok(match.get('driverPhone') === '+8801922222222', 'match nothi te driver er number');

  const trackMid = await lookupTracking(trackingCode, '01811111111');
  ok(trackMid.ok, 'malik code+phone e khoj pan');
  ok(trackMid.ok && trackMid.view.matchedContact === null, 'complete er AGE matchedContact dekha jay NA');
  const wrongPhone = await lookupTracking(trackingCode, '01699999999');
  ok(!wrongPhone.ok, 'bhul phone e KICHU i dekha jay na');

  const done = await completeMatch(staff, jobId);
  ok(done.ok, 'complete holo');
  const trackEnd = await lookupTracking(trackingCode, '01811111111');
  ok(
    trackEnd.ok && trackEnd.view.matchedContact?.phone === '+8801922222222',
    'complete er POR malik driver er number dekhen',
  );
  ok((await getPublishedJobs()).length === 0, 'completed job feed e ar NAI');

  console.log('\n━━ 6 · Dwitiyo post - multi-job model ━━');
  const sub2 = await submitJob(employer, intake, photoPaths);
  ok(sub2.ok, 'ek i malik er dwitiyo post joma jay');
  ok(
    (await getUser(employer.uid))?.employerStatus === EMPLOYER_STATUS.verified,
    'verified malik abar jachai e NAME NA',
  );
  const own2 = await getOwnJobs(employer.uid);
  ok(own2.length === 2, 'dashboard e duita post');

  await cleanup();
  finish();
}

function finish() {
  console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
