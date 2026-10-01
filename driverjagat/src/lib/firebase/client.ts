/**
 * Firebase client SDK - browser er jonno.
 *
 * Ekhane sudhu NEXT_PUBLIC_* mullo. Ei sob key browser e dekha
 * jay - eta thik ache, Firebase ei bhabe i kaj kore. Asol nirapotta
 * ashe firestore.rules theke, key luknor theke NA.
 *
 * Kono service account key ekhane KOKHONO na - ota admin.ts e.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Env thik bhabe deya ache kina - na thakle nirob bhabe bhul kaj korbe */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true';

/**
 * Emulator ek bar i jog kora jay - dubar korle Firebase throw kore.
 * Next.js er hot reload e module abar chole, tai globalThis e
 * mone rakhi.
 */
const g = globalThis as typeof globalThis & { __tjEmulatorReady?: boolean };

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase env deya nai. .env.local e NEXT_PUBLIC_FIREBASE_* bosan - ' +
        'dekhun .env.example',
    );
  }
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  authInstance = getAuth(getFirebaseApp());
  if (useEmulator && !g.__tjEmulatorReady) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(getFirebaseApp());
  if (useEmulator && !g.__tjEmulatorReady) {
    connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  }
  return dbInstance;
}

export function getBucket(): FirebaseStorage {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(getFirebaseApp());
  if (useEmulator && !g.__tjEmulatorReady) {
    connectStorageEmulator(storageInstance, '127.0.0.1', 9199);
    g.__tjEmulatorReady = true;
  }
  return storageInstance;
}
