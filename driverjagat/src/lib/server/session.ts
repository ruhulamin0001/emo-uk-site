import 'server-only';

/**
 * Session cookie pora o jachai kora.
 *
 * Ei file ta SUDHU cookie niye kaj kore. "Ke ki korte pare"
 * - seta lib/server/auth.ts e.
 */

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { EMPLOYER_STATUS, ROLE, type EmployerStatus, type Role } from '@/types/enums';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/session-cookie';

export { SESSION_COOKIE, SESSION_MAX_AGE_MS };

export interface Session {
  uid: string;
  email: string | null;
  name: string;
  role: Role;
  employerStatus: EmployerStatus;
  banned: boolean;
}

/**
 * `checkRevoked: true` - Firebase e giye dekhe token ta
 * bati kora hoyeche kina. Keu ke ban korle SATHE SATHE tar
 * session mora uchit, 14 din opekkha kore na.
 *
 * Ei ta protita request e ekta network call - kintu admin
 * route o taka-r kaj e seta thik ache.
 */
export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const c = await adminAuth().verifySessionCookie(raw, true);

    return {
      uid: c.uid,
      email: (c.email as string | undefined) ?? null,
      name: (c.name as string | undefined) ?? 'ব্যবহারকারী',
      /* role o status ASHE custom claim theke, client theke NA.
         Claim sudhu Admin SDK boshate pare (niyom #2). */
      role: ((c.role as Role | undefined) ?? ROLE.user),
      employerStatus: ((c.employerStatus as EmployerStatus | undefined) ?? EMPLOYER_STATUS.none),
      banned: Boolean(c.banned),
    };
  } catch {
    /* Meyad shesh, bati kora, ba bhanga cookie - sob khetre i
       "login kora nai" dhora hoy */
    return null;
  }
}
