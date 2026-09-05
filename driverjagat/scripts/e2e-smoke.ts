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

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, isEmulator } from '../src/lib/firebase/admin';
import { submitJob, getUser } from '../src/lib/server/employers';
import {
  getOwnJobs,
  getPublicJobByCode,
  getPublishedJobs,
  getJobForAdmin,
} from '../src/lib/server/jobs';
import { approveJob } from '../src/lib/server/job-decisions';
import {
  clearPaymentAttention,
  getPaymentsNeedingAttention,
  markManuallyPaid,
  settlePayment,
  startPayment,
  getPaymentsFor,
} from '../src/lib/server/payments';
import { runLifecycle, runPaymentSweep } from '../src/lib/server/lifecycle';
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
  PAYMENT_STATUS,
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

  const settle = await markManuallyPaid(staff, pay.paymentId, 'TRX-E2E-1');
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

  const again = await markManuallyPaid(staff, pay.paymentId, 'TRX-E2E-1');
  ok(again.ok && again.alreadyDone, 'dwitiyo settle e kichhu ghote na (idempotent)');

  /* Niyom #9 - note faka ba choto hole "peyechi" bola JAY NA */
  const pay2 = await startPayment({
    userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
    kind: PAYMENT_KIND.job_fee, jobId, siteUrl: 'http://localhost:3000',
  });
  if (pay2.ok) {
    const noNote = await markManuallyPaid(staff, pay2.paymentId, '  ');
    ok(!noNote.ok, 'faka note e "taka peyechi" ATKAY');
    const tinyNote = await markManuallyPaid(staff, pay2.paymentId, 'ok');
    ok(!tinyNote.ok, 'choto note (4 oksor er kom) ATKAY');
    const paid2 = await adminDb().collection('payments').doc(pay2.paymentId).get();
    ok(paid2.get('status') !== 'success', 'atke jaowa payment success HOY NI');
    await paid2.ref.delete();
  }

  /* Niyom #4 - provider "esechhe" bollo kintu onko OJANA (0) */
  const pay3 = await startPayment({
    userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
    kind: PAYMENT_KIND.job_fee, jobId, siteUrl: 'http://localhost:3000',
  });
  if (pay3.ok) {
    /* Nokol gateway: paid bole, kintu amount 0 - age ei ta CHUPCHAP
       pass kore jeto, ekhon ATKANOR kotha */
    await adminDb().collection('payments').doc(pay3.paymentId).update({
      providerId: 'e2e-fake', providerRef: 'ref-0-amount',
    });
    const bad = await settlePayment(pay3.paymentId, { paid: true, amount: 0 });
    const doc3 = await adminDb().collection('payments').doc(pay3.paymentId).get();
    /* providerById() ojana id te manual dey, ar manual paid:false bole -
       tai ekhane fol ghote na. Mul kotha: success HOY NA. */
    ok(doc3.get('status') !== 'success', 'onko ojana hole payment success HOY NA', String(bad.ok));
    await doc3.ref.delete();
  }

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

  console.log('\n━━ 7 · Taka AGE, approve PORE - atke thake na ━━');
  if (sub2.ok) {
    const job2 = sub2.jobId;
    const pay4 = await startPayment({
      userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
      kind: PAYMENT_KIND.job_fee, jobId: job2, siteUrl: 'http://localhost:3000',
    });
    ok(pay4.ok, 'approve er AGE i taka deya suru kora jay');
    if (pay4.ok) {
      const s4 = await markManuallyPaid(staff, pay4.paymentId, 'TRX-E2E-AGE');
      ok(s4.ok, 'taka nothibhukto holo');
      ok(
        (await getPublishedJobs()).length === 0,
        'approve chhara taka dileo feed e OTHE NA',
      );

      /* Niyom #4 er sesh ordhek: nothi ta malik er sari te uthechhe to? */
      const stuck = await getPaymentsNeedingAttention();
      ok(
        stuck.some((x) => x.id === pay4.paymentId),
        'atke jaowa taka MALIK ER SARI te othe',
        String(stuck.length),
      );
      ok(
        stuck.find((x) => x.id === pay4.paymentId)?.note?.includes('অনুমোদনের আগে') === true,
        'keno atkeche seta note e lekha',
      );

      /* Ekhon approve - duita shorto i pura, tai prokash hobar kotha */
      const ap2 = await approveJob(staff, job2);
      ok(ap2.ok, 'approve holo');
      ok(
        (await getPublishedJobs()).length === 1,
        'approve er sathe sathe age-deya taka r job ta feed e uthlo',
      );
      const after = await adminDb().collection('payments').doc(pay4.paymentId).get();
      ok(after.get('needsOwner') === false, 'kaj hoye jaowar por sari theke neme gelo');
      ok(
        (await getPaymentsNeedingAttention()).every((x) => x.id !== pay4.paymentId),
        'sari te ar nai',
      );
    }
  }

  console.log('\n━━ 8 · Sari theke namano - note baddhotamulok ━━');
  {
    const pay5 = await startPayment({
      userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
      kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
    });
    if (pay5.ok) {
      await adminDb().collection('payments').doc(pay5.paymentId).update({
        needsOwner: true, note: 'কম টাকা এসেছে - ৫০, দরকার ৫০০',
      });
      const tiny = await clearPaymentAttention(staff, pay5.paymentId, 'ok');
      ok(!tiny.ok, 'choto note e sari theke namano JAY NA');
      const still = await adminDb().collection('payments').doc(pay5.paymentId).get();
      ok(still.get('needsOwner') === true, 'sari tei ache');

      const cleared = await clearPaymentAttention(staff, pay5.paymentId, 'বিকাশে ফেরত দিলাম');
      ok(cleared.ok, 'thik note e namano jay');
      const gone = await adminDb().collection('payments').doc(pay5.paymentId).get();
      ok(gone.get('needsOwner') === false, 'sari theke nemeche');
      ok(
        String(gone.get('note')).includes('কম টাকা') && String(gone.get('note')).includes('ফেরত'),
        'purono karon ta MOCHE NA - notun kotha tar pore joRe',
      );
      const log = await adminDb()
        .collection('activity_logs')
        .where('action', '==', 'payment.attention_cleared')
        .limit(5).get();
      ok(!log.empty, 'audit log e lekha holo');
      await gone.ref.delete();
    }
  }

  console.log('\n━━ 9 · Rojkar jhaṛu - ASOL atke thaka payment ━━');
  {
    /**
     * ⚠️ §৬: "kichhu chhoy ni" dhoroner poriksha likhben NA -
     * function ta KICHHU NA KORLEO ogulo pass korto.
     *
     * Tai ekhane ekta SOTTI atke thaka gateway-payment banano
     * hoy (25 ghonta purono, manual na) ar dekha hoy jhaṛu ta
     * take KHUJE PAY kina.
     */
    const pay6 = await startPayment({
      userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
      kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
    });
    if (pay6.ok) {
      const ref = adminDb().collection('payments').doc(pay6.paymentId);
      await ref.update({
        providerId: 'e2e-gateway',
        createdAt: Timestamp.fromMillis(Date.now() - 25 * 3600_000),
      });

      const swept = await runPaymentSweep();
      ok(swept.checked >= 1, 'jhaṛu atke thaka payment ta KHUJE PELO', String(swept.checked));
      ok(swept.stuckOver24h >= 1, '24 ghontar beshi purono - rog nirnoy er sonkhya y utheche');
      ok(swept.recovered === 0, 'taka ase ni tai uddhar o hoy ni');

      /* Ekdom taja ta jate jhaṛu na chhoy - manush tokhono patay */
      const fresh = await startPayment({
        userId: staff.uid, name: 'তাজা', phone: '+8801700000000',
        kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
      });
      if (fresh.ok) {
        await adminDb().collection('payments').doc(fresh.paymentId)
          .update({ providerId: 'e2e-gateway' });
        const again = await runPaymentSweep();
        const freshDoc = await adminDb().collection('payments').doc(fresh.paymentId).get();
        ok(
          freshDoc.get('status') === PAYMENT_STATUS.pending,
          '15 minute er kom boyosh er ta jhaṛu CHHOY NI',
          String(again.checked),
        );
        await freshDoc.ref.delete();
      }
      await ref.delete();
    }
  }

  console.log('\n━━ 10 · Ek shathe duita cholti payment JAY NA ━━');
  {
    /* §৪ক + niyom ১১: ek i manuser duita opekkhoman session
       thakle gateway (number + onko diye melay) kon ta melabe
       janto na */
    const first = await startPayment({
      userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
      kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
    });
    ok(first.ok, 'prothom ta jay');
    const second = await startPayment({
      userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
      kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
    });
    ok(!second.ok, 'dwitiyo ta ATKAY - "ekta lenden ekhono cholche"');

    if (first.ok) {
      /* Ar boyosh-shima ta sotti kaj kore to? 4 din purono
         korle abar cheshta korte para uchit (§৪ক) */
      await adminDb().collection('payments').doc(first.paymentId).update({
        createdAt: Timestamp.fromMillis(Date.now() - 4 * 24 * 3600_000),
      });
      const later = await startPayment({
        userId: employer.uid, name: 'ই২ই মালিক', phone: '+8801811111111',
        kind: PAYMENT_KIND.connection_fee, siteUrl: 'http://localhost:3000',
      });
      ok(later.ok, 'purono (4 din) cholti ta r pothe daray na - CHIROKAL atke thake na');
      if (later.ok) await adminDb().collection('payments').doc(later.paymentId).delete();
      await adminDb().collection('payments').doc(first.paymentId).delete();
    }
  }

  console.log('\n━━ 11 · Rojkar meyad - job feed e chirokal thake na ━━');
  {
    /**
     * ⚠️ §৬ er niyome: SOTTI ekta meyad-utirno job baniye dekha
     * hoy se feed theke name kina. "Kichhu chhoy ni" poriksha
     * likhle expireJobs() faka thakleo pass korto.
     */
    const sub3 = await submitJob(employer, intake, photoPaths);
    if (sub3.ok) {
      const jobRef = adminDb().collection('jobs').doc(sub3.jobId);
      /* Prokashito, kintu meyad kal PORE gechhe */
      await jobRef.update({
        stage: JOB_STAGE.published,
        approvedAt: Timestamp.now(),
        publishedAt: Timestamp.now(),
        validUntil: Timestamp.fromMillis(Date.now() - 3600_000),
      });
      /* ⚠️ Ei job TA feed e ache kina - motta gona na. Age r
         dhap gulo r job o feed e thakte pare. */
      const inFeed = async () =>
        (await getPublishedJobs()).some((j) => j.id === sub3.jobId);
      ok(await inFeed(), 'meyad-utirno job EKHONO feed e (jhaṛu chalanor AGE - ei tai rog)');

      const rep = await runLifecycle();
      ok(rep.expiredJobs === 1, 'jhaṛu meyad sesh korlo', String(rep.expiredJobs));
      ok(!(await inFeed()), 'feed theke NEME gechhe');
      ok(
        (await getJobForAdmin(sub3.jobId))?.view.stage === 'expired',
        'dhap ekhon expired - mucha hoy ni, malik dekhte paben',
      );

      /* ⚠️ Cholti alochona jate na bhange - shortlisted ta chhoy na */
      await jobRef.update({
        stage: JOB_STAGE.shortlisted,
        validUntil: Timestamp.fromMillis(Date.now() - 3600_000),
      });
      const rep2 = await runLifecycle();
      ok(rep2.expiredJobs === 0, 'shortlisted (admin kotha bolchen) CHHOY NA');
      await jobRef.collection('private').doc('contact').delete();
      await jobRef.delete();
    }
  }

  console.log('\n━━ 12 · Approve kore taka na dile 7 din e batil ━━');
  {
    const sub4 = await submitJob(employer, intake, photoPaths);
    if (sub4.ok) {
      const jobRef = adminDb().collection('jobs').doc(sub4.jobId);
      /* Approve hoyeche 8 din age, taka ase ni - tai ekhono pending */
      await jobRef.update({
        approvedAt: Timestamp.fromMillis(Date.now() - 8 * 24 * 3600_000),
        approvedBy: staff.uid,
      });

      const rep = await runLifecycle();
      ok(rep.expiredApprovals === 1, 'purono approval batil holo', String(rep.expiredApprovals));
      const after = await jobRef.get();
      ok(after.get('approvedAt') === null, 'approvedAt mocha hoyeche - abar approve korte hobe');
      ok(after.get('stage') === JOB_STAGE.pending, 'job MUCHA HOY NI - pending e ache');

      /* Taja approval jate na bhange */
      await jobRef.update({ approvedAt: Timestamp.now() });
      const rep2 = await runLifecycle();
      ok(rep2.expiredApprovals === 0, 'taja approval (aj ker) CHHOY NA');

      /* ⚠️ D-013: verified malik ke namano HOY NA - tar onno post gulo bache */
      ok(
        (await getUser(employer.uid))?.employerStatus === EMPLOYER_STATUS.verified,
        'verified malik verified i thaken (ekadhik post er model)',
      );

      await jobRef.collection('private').doc('contact').delete();
      await jobRef.delete();
    }
  }

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
