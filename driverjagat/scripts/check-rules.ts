/**
 * Firestore o Storage er NIYOM sotti PROYOG hoy kina.
 *
 *   npm run emulator      (alada terminal)
 *   npm run check:rules
 *
 * File e niyom LEKHA thaka ar niyom KAJ kora ek jinish na.
 * Ekta bhul bracket hole lekha thakto, kintu kichhu i atkato na.
 * Ei script ASOL CLIENT SDK diye - thik jevabe browser cheshta
 * korto - nishiddho jinish gulo chaite jay. "permission-denied"
 * ASHA CHAI.
 *
 * Admin SDK diye porikkha kora HOY NA - Admin SDK niyom
 * sompurno pash katiye jay, test sob somoy pass korto.
 */

import { initializeApp, deleteApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectStorageEmulator,
  getBytes,
  getStorage,
  ref as sref,
  uploadBytes,
} from 'firebase/storage';
import { adminDb, isEmulator } from '../src/lib/firebase/admin';
import { JOB_STAGE } from '../src/types/enums';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? ' - ' + extra : ''}`);
};

/* Firebase permission error e `message` te sudhu line number
   thake - `code` dekhte hoy. Storage er bhasha abar ALADA. */
function isDenied(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? '';
  const m = e instanceof Error ? e.message : String(e);
  return (
    code === 'permission-denied' ||
    code === 'storage/unauthorized' ||
    /permission|insufficient|unauthorized|false for /i.test(m)
  );
}

async function denied(what: string, run: () => Promise<unknown>) {
  try {
    await run();
    ok(false, what, 'DHUKTE PERECHE - ei ta FAAS!');
  } catch (e) {
    ok(isDenied(e), what, isDenied(e) ? '' : String((e as Error)?.message).slice(0, 60));
  }
}

async function allowed(what: string, run: () => Promise<unknown>) {
  try {
    await run();
    ok(true, what);
  } catch (e) {
    ok(false, what, (e instanceof Error ? e.message : String(e)).slice(0, 70));
  }
}

async function main() {
  if (!isEmulator()) {
    console.error('\n   Ei test SUDHU emulator e - asol server e na.\n');
    process.exit(1);
  }

  /* ── Admin SDK diye data bosai (seed - niyom pash katiye) ── */
  const admin = adminDb();

  await admin.collection('jobs').doc('rules-published').set({
    stage: JOB_STAGE.published,
    trackingCode: 'DJ-XX-99001',
    vehicleType: 'private_car',
    salary: 15000,
    createdBy: 'rules-employer-uid',
    leadCount: 3,
    photoPaths: [],
  });
  await admin
    .collection('jobs')
    .doc('rules-published')
    .collection('private')
    .doc('contact')
    .set({
      employerName: 'গোপন নাম',
      phone: '+8801711111111',
      fullAddress: 'বাড়ি ৭, রোড ২, মিরপুর',
    });
  /* Match nothi - number binimoy er record, eta o gopon */
  await admin
    .collection('jobs')
    .doc('rules-published')
    .collection('private')
    .doc('match')
    .set({ driverName: 'গোপন ড্রাইভার', driverPhone: '+8801744444444' });

  await admin.collection('jobs').doc('rules-pending').set({
    stage: JOB_STAGE.pending,
    trackingCode: 'DJ-XX-99002',
    createdBy: 'rules-employer-uid',
  });

  await admin.collection('contact_leads').doc('rules-lead').set({
    name: 'আগ্রহী', phone: '+8801722222222', jobId: 'rules-published', licenseType: 'light', experienceYears: 3,
  });
  await admin.collection('employer_phones').doc('+8801733333333').set({ uid: 'x' });
  await admin.collection('rate_limits').doc('rules-rl').set({ count: 9 });
  await admin.collection('staff').doc('rules-staff').set({ name: 'Admin Nam' });
  await admin.collection('payments').doc('rules-pay').set({ userId: 'onno-keu', amount: 100 });
  await admin.collection('activity_logs').doc('rules-log').set({ action: 'x' });
  await admin.collection('users').doc('rules-user').set({ employerStatus: 'verified' });
  await admin.collection('counters').doc('job_serial').set({ value: 1 }, { merge: true });

  /* ── Client SDK - browser jevabe dekhto ── */
  const app = initializeApp(
    { apiKey: 'fake-api-key', projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-driverjagat', storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'demo-driverjagat.appspot.com' },
    'rules-check',
  );
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const storage = getStorage(app);
  connectStorageEmulator(storage, '127.0.0.1', 9199);

  console.log('\n━━ 1 · Login CHARA (ajnabi) ━━');

  await allowed('prokashsho job pora JAY', () =>
    getDoc(doc(db, 'jobs', 'rules-published')),
  );
  await denied('pending job pora jay NA', () =>
    getDoc(doc(db, 'jobs', 'rules-pending')),
  );
  await denied('PROKASHSHO job er GOPON ghor o pora jay NA (D-009: thikana-phone)', () =>
    getDoc(doc(db, 'jobs', 'rules-published', 'private', 'contact')),
  );
  await denied('match nothi (number binimoy) pora jay NA', () =>
    getDoc(doc(db, 'jobs', 'rules-published', 'private', 'match')),
  );
  await denied('job lekha jay NA (browser theke)', () =>
    setDoc(doc(db, 'jobs', 'rules-published'), { stage: 'completed' }),
  );
  await denied('stage filter diye pending khora jay NA', () =>
    getDocs(query(collection(db, 'jobs'), where('stage', '==', 'pending'))),
  );

  await denied('contact_leads pora jay NA', () =>
    getDoc(doc(db, 'contact_leads', 'rules-lead')),
  );
  await denied('contact_leads e LEKHA-O jay na (spam)', () =>
    setDoc(doc(db, 'contact_leads', 'nokol'), { name: 'x' }),
  );
  await denied('employer_phones pora jay NA (doc id i phone)', () =>
    getDoc(doc(db, 'employer_phones', '+8801733333333')),
  );
  await denied('rate_limits pora jay NA', () =>
    getDoc(doc(db, 'rate_limits', 'rules-rl')),
  );
  await denied('rate_limits LEKHA jay na - keu nijer gonona shunyo korte parto', () =>
    setDoc(doc(db, 'rate_limits', 'rules-rl'), { count: 0 }),
  );
  await denied('staff talika pora jay NA (phishing er khabar)', () =>
    getDoc(doc(db, 'staff', 'rules-staff')),
  );
  await denied('onno karo payment pora jay NA', () =>
    getDoc(doc(db, 'payments', 'rules-pay')),
  );
  await denied('audit log pora jay NA', () =>
    getDoc(doc(db, 'activity_logs', 'rules-log')),
  );
  await denied('audit log e lekha jay NA', () =>
    setDoc(doc(db, 'activity_logs', 'nokol'), { action: 'x' }),
  );
  await denied('onno karo user doc pora jay NA', () =>
    getDoc(doc(db, 'users', 'rules-user')),
  );
  await allowed('counters pora JAY (homepage er sonkha)', () =>
    getDoc(doc(db, 'counters', 'job_serial')),
  );
  await denied('nam-na-kora collection - default deny', () =>
    getDoc(doc(db, 'ajaira_collection', 'x')),
  );

  console.log('\n━━ 2 · Login kora sadharon user ━━');
  const cred = await signInAnonymously(auth);
  const me = cred.user.uid;

  await denied('login korleo GOPON ghor pora jay NA', () =>
    getDoc(doc(db, 'jobs', 'rules-published', 'private', 'contact')),
  );
  await denied('login korleo onno karo user doc NA', () =>
    getDoc(doc(db, 'users', 'rules-user')),
  );
  await allowed('nijer user doc pora JAY', async () => {
    await admin.collection('users').doc(me).set({ employerStatus: 'none' });
    return getDoc(doc(db, 'users', me));
  });

  console.log('\n━━ 3 · Storage ━━');
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

  await allowed('nijer folder e gari r chobi upload JAY', () =>
    uploadBytes(sref(storage, `job_photos/${me}/rules-p1.jpg`), jpeg, {
      contentType: 'image/jpeg',
    }),
  );
  await allowed('gari r chobi SOBAI porte pare (D-008 - feed er card)', async () => {
    const { adminBucket } = await import('../src/lib/firebase/admin');
    await adminBucket().file('job_photos/onno-keu/rules-p2.jpg').save(Buffer.from(jpeg), {
      contentType: 'image/jpeg',
    });
    return getBytes(sref(storage, 'job_photos/onno-keu/rules-p2.jpg'));
  });
  await denied('onno karo folder e upload jay NA', () =>
    uploadBytes(sref(storage, 'job_photos/onno-keu/nokol.jpg'), jpeg, {
      contentType: 'image/jpeg',
    }),
  );
  await allowed('nijer employer_docs e kagoj upload JAY', () =>
    uploadBytes(sref(storage, `employer_docs/${me}/rules-doc1.jpg`), jpeg, {
      contentType: 'image/jpeg',
    }),
  );
  await denied('ONNO karo employer_docs pora jay NA (NID = PII)', async () => {
    const { adminBucket } = await import('../src/lib/firebase/admin');
    await adminBucket().file('employer_docs/onno-keu/rules-nid.jpg').save(Buffer.from(jpeg), {
      contentType: 'image/jpeg',
    });
    return getBytes(sref(storage, 'employer_docs/onno-keu/rules-nid.jpg'));
  });
  await denied('EK I path e ABAR upload jay NA (jachai er por bodlano)', () =>
    uploadBytes(sref(storage, `employer_docs/${me}/rules-doc1.jpg`), jpeg, {
      contentType: 'image/jpeg',
    }),
  );
  await denied('jekhane-sekhane upload - default deny', () =>
    uploadBytes(sref(storage, `ajaira/${me}/x.jpg`), jpeg, {
      contentType: 'image/jpeg',
    }),
  );

  /* ── Porishkar ── */
  for (const [col, id] of [
    ['jobs', 'rules-published'],
    ['jobs', 'rules-pending'],
    ['contact_leads', 'rules-lead'],
    ['employer_phones', '+8801733333333'],
    ['rate_limits', 'rules-rl'],
    ['staff', 'rules-staff'],
    ['payments', 'rules-pay'],
    ['activity_logs', 'rules-log'],
    ['users', 'rules-user'],
    ['users', me],
  ] as const) {
    await admin.collection(col).doc(id).delete().catch(() => {});
  }
  for (const sub of ['contact', 'match']) {
    await admin
      .collection('jobs').doc('rules-published')
      .collection('private').doc(sub).delete().catch(() => {});
  }

  await deleteApp(app);

  console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
