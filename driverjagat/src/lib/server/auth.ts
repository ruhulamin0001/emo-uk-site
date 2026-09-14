import 'server-only';

/**
 * Server Action er pahara.
 *
 * Protita privileged Server Action er PROTHOM line e ei
 * function gulor ekta.
 *
 * Emulator e ekta nokol admin ache - nahole local e kaj kora
 * jeto na. Kintu ota SUDHU emulator e. Asol project e cookie
 * chara kichu i chole na.
 */

import { redirect } from 'next/navigation';
import { adminDb, isEmulator } from '@/lib/firebase/admin';
import { readSession, type Session } from './session';
import { EMPLOYER_STATUS, ROLE, type EmployerStatus } from '@/types/enums';

export type { Session };

/**
 * EI PROJEKTER SOBCHEYE BIPOJJONOK JAYGA.
 *
 * Niche `DEV_SESSION` ekjon MALIK - login chara. Seta khulte
 * DUITA shorto lage, ekta na:
 *
 *   1. `isEmulator()` - `NEXT_PUBLIC_USE_EMULATOR === 'true'`
 *   2. NODE_ENV production NA
 *
 * (1) ekta `NEXT_PUBLIC_*` var - Docker BUILD ER SOMOY image er
 * bhitore dhuke jay. Ekta bhul `--build-arg` hole PROTITA VISITOR
 * malik hoye jeto - admin panel, protita poribar er phone, chobi,
 * sob khola. Ar kono error asto na. (TutorJagat e ei fak ta
 * production e jawar age dhora porechilo - tai duita shorto.)
 */
const devAdminAllowed = (): boolean =>
  isEmulator() && process.env.NODE_ENV !== 'production';

/** Emulator e kaj korar jonno nokol admin */
const DEV_SESSION: Session = {
  uid: 'dev-admin',
  email: 'dev@driverjagat.test',
  name: 'ডেভ অ্যাডমিন',
  role: ROLE.owner,
  employerStatus: EMPLOYER_STATUS.none,
  banned: false,
};

export class AuthError extends Error {
  constructor(message = 'অনুমতি নেই') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Asol session - cookie theke.
 * Emulator e cookie na thakle nokol admin fera hoy (upore dekhun).
 */
export async function getSession(): Promise<Session | null> {
  const s = await readSession();
  if (s) return s.banned ? null : s;
  if (devAdminAllowed()) return DEV_SESSION;
  return null;
}

/** Sudhu login kora ache kina */
export async function requireAuth(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new AuthError('আগে লগইন করুন');
  return s;
}

/**
 * Jachai kora malik - taka diye verification sesh (verified).
 *
 * Obostha ta cookie theke NEWA HOY NA - Firestore theke pora hoy.
 *
 * Kano: cookie er claim login er MUHURTE lekha hoy, tarpor 14 din
 * pathorer moto boshe thake. Kintu malik er obostha ek dine
 * tinbar bodlay - draft → under_review → approved_unpaid → verified.
 * Cookie dekhle taka dewa malik o "আগে যাচাই সম্পন্ন করুন"
 * dekhten, ar ulto dike rejected malik kaj chalie jeten.
 * (TutorJagat er requireVerifiedTutor er hubuhu shikkha.)
 */
export async function requireVerifiedEmployer(): Promise<Session> {
  const s = await requireAuth();

  const snap = await adminDb().collection('users').doc(s.uid).get();
  const status = (snap.get('employerStatus') as EmployerStatus | undefined) ?? EMPLOYER_STATUS.none;

  if (status !== EMPLOYER_STATUS.verified) {
    throw new AuthError('আগে যাচাই সম্পন্ন করুন');
  }

  /* Cookie r purono obostha ta ekhane thik kore fera hoy */
  return { ...s, employerStatus: status };
}

export async function requireStaff(): Promise<Session> {
  const s = await getSession();
  if (!s || (s.role !== ROLE.admin && s.role !== ROLE.owner)) {
    throw new AuthError('এই কাজটি করার অনুমতি নেই');
  }
  return s;
}

/* ══════════════════════════════════════════════════════════════
   PATAR JONNO - error na, REDIRECT

   Upor er function gulo ERROR chhore - Server Action er jonno
   THIK. Kintu PATA te error chhorle Next 500 dekhay - admin
   bhabten site bhenge geche, othocho sudhu session sesh.
   ══════════════════════════════════════════════════════════════ */

export async function requireStaffPage(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/signin?next=%2Fadmin%2Fjobs');
  /* "Onumoti nai" na - "nai" dekhai. Bolle ekjon jene jeto
     je ei thikanay sotti kichhu ache. */
  if (s.role !== ROLE.admin && s.role !== ROLE.owner) redirect('/');
  return s;
}

export async function requireOwnerPage(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect('/signin?next=%2Fadmin%2Fpayments');
  if (s.role !== ROLE.owner) redirect('/');
  return s;
}

/** Taka, ban, role bodol, settings - sudhu malik */
export async function requireOwner(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== ROLE.owner) {
    throw new AuthError('এই কাজটি শুধু মালিক করতে পারেন');
  }
  return s;
}
