'use client';

/**
 * Malik er login - Google o email link.
 *
 * Driver er kono account NAI. Ei file ta SUDHU gari r malik
 * der jonno. Onnera tracking code + phone diye dekhen.
 *
 * Kaj korar niyom:
 *   1. Firebase client SDK diye login → idToken
 *   2. Oi token server e pathai → server httpOnly cookie banay
 *   3. Tarpor sob Server Action oi cookie theke porichoy pay
 *
 * Browser er token ta SORASORI byabohar kora HOY NA. httpOnly
 * cookie javascript theke pora jay na, tai XSS hole o session
 * churi kora jabe na.
 */

import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './client';

const EMAIL_KEY = 'dj:signin-email';

export interface SignInResult {
  ok: boolean;
  message?: string;
}

/** Firebase er code → manush er bhashay */
function friendly(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'লগইন বাতিল হয়েছে';
    case 'auth/popup-blocked':
      return 'ব্রাউজার পপআপ আটকে দিয়েছে - অনুমতি দিয়ে আবার চেষ্টা করুন';
    case 'auth/network-request-failed':
      return 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না';
    case 'auth/invalid-email':
      return 'ইমেইলটি সঠিক নয়';
    case 'auth/too-many-requests':
      return 'অনেকবার চেষ্টা হয়েছে - কিছুক্ষণ পর আবার করুন';
    default:
      return 'লগইন করা যায়নি, আবার চেষ্টা করুন';
  }
}

/** Token ta server e pathiye httpOnly cookie banai */
async function exchangeForSession(user: User): Promise<SignInResult> {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    return { ok: false, message: 'সেশন তৈরি করা যায়নি' };
  }
  return { ok: true };
}

export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const provider = new GoogleAuthProvider();
    // Bar bar login korle o account bachar sujog thakuk
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    return exchangeForSession(cred.user);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    return { ok: false, message: friendly(code) };
  }
}

/**
 * Email e link pathai.
 *
 * Email ta localStorage e rakhte HOBE. Link e chap dile
 * Firestore jante chay "kon email er jonno ei link" - na thakle
 * user ke abar email likhte bola lage, ar beshirbhag manush
 * tokhon chere dey.
 */
export async function sendEmailLink(email: string): Promise<SignInResult> {
  try {
    await sendSignInLinkToEmail(getFirebaseAuth(), email, {
      url: `${window.location.origin}/signin/verify`,
      handleCodeInApp: true,
    });
    localStorage.setItem(EMAIL_KEY, email);
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    return { ok: false, message: friendly(code) };
  }
}

export function isEmailLink(url: string): boolean {
  try {
    return isSignInWithEmailLink(getFirebaseAuth(), url);
  } catch {
    return false;
  }
}

export async function completeEmailLink(url: string): Promise<SignInResult> {
  try {
    /* Onno device e link khulle localStorage khali thakbe - tokhon email ta chaite hobe, ei ta bhul na */
    const email = localStorage.getItem(EMAIL_KEY);
    if (!email) {
      return { ok: false, message: 'কোন ইমেইলে লিংক পাঠানো হয়েছিল লিখুন' };
    }
    const cred = await signInWithEmailLink(getFirebaseAuth(), email, url);
    localStorage.removeItem(EMAIL_KEY);
    return exchangeForSession(cred.user);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    return { ok: false, message: friendly(code) };
  }
}

/** Onno device e link khullen - email ta hate deya */
export async function completeEmailLinkWith(
  url: string,
  email: string,
): Promise<SignInResult> {
  try {
    const cred = await signInWithEmailLink(getFirebaseAuth(), email, url);
    localStorage.removeItem(EMAIL_KEY);
    return exchangeForSession(cred.user);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? '';
    return { ok: false, message: friendly(code) };
  }
}

export async function signOut(): Promise<void> {
  // Duita jayga theke i sorate hobe - cookie ar Firebase duitai
  await fetch('/api/auth/signout', { method: 'POST' });
  try {
    await fbSignOut(getFirebaseAuth());
  } catch {
    // Cookie ta muche gele o login sesh - ei bhul e kichu jay ashe na
  }
}
