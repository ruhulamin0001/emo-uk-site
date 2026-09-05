import 'server-only';

/**
 * Firebase Admin SDK - SUDHU server e.
 *
 * Upor er `import 'server-only'` line ta SOB THEKE UPORE thakte
 * HOBE (CLAUDE.md niyom #4). Keu bhule kono client component e ei
 * file import korle build TOKHON I fail korbe - production e giye
 * service account key faas hobe na.
 *
 * Admin SDK sob niyom (firestore.rules) TOPKE jay. Tai ekhane ja
 * likha hoy tar dayitto puro amader - protita server action er
 * prothom line e requireAuth/requireRole (niyom #12).
 */

import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

/**
 * Emulator e chalale service account lage na - sudhu ei duita
 * env var thakle Admin SDK nijei emulator e jog dey.
 */
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
  /**
   * DUITA storage var lage. Admin SDK er niche @google-cloud/storage
   * chole, ar SE chene `STORAGE_EMULATOR_HOST` (protocol SOHO).
   * Sudhu FIREBASE_ ta dile file.download() emulator e na giye
   * asol Google e credential khunjto - ar "All promises were
   * rejected" bole chobi 404 hoye jeto. (Phase 6 E2E te dhora.)
   */
  process.env.STORAGE_EMULATOR_HOST ??= 'http://127.0.0.1:9199';
}

let cached: App | undefined;

function adminApp(): App {
  if (cached) return cached;
  if (getApps().length) {
    cached = getApp();
    return cached;
  }

  if (useEmulator) {
    cached = initializeApp({
      projectId: projectId ?? 'demo-driverjagat',
      /**
       * storageBucket EKHANE O lage. Na dile `adminBucket()`
       * er kono nam nai - `file().download()` throw kore, ar
       * catch ta seta ke chupchap 404 baniye dey. Emulator e
       * chobi kokhono khulto na, ar karon ta dekha jeto na.
       */
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return cached;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin er env deya nai - FIREBASE_CLIENT_EMAIL o ' +
        'FIREBASE_PRIVATE_KEY lagbe. Dekhun .env.example',
    );
  }

  cached = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      /* .env e newline `\n` hishebe thake - asol newline e ferate hobe,
         nahole "Invalid PEM formatted message" error ashe */
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return cached;
}

export const adminAuth = (): Auth => getAuth(adminApp());
export const adminDb = (): Firestore => getFirestore(adminApp());
export const adminBucket = () => getStorage(adminApp()).bucket();

/** Emulator e cholche kina - seed script o test e lage */
export const isEmulator = (): boolean => useEmulator;
