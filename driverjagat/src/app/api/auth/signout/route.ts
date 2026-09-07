import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE } from '@/lib/session-cookie';
import { sameOrigin } from '@/lib/server/same-origin';

/**
 * Logout.
 *
 * Age ei ta SUDHU browser er cookie ta muchto.
 *
 * Mane "logout" kotha ta ekta MITHYA chilo. Cookie ta Firebase
 * er kachhe 14 din porjonto BOIDHO thakto. Keu jodi oi cookie
 * ta ekbar peto - cyber cafe r computer, ba kauke dhar deya
 * phone - tahole "logout" chapar POREO se dhuke jete parto.
 *
 * BD te beshirbhag manush cafe r computer ba dharer phone
 * babohar koren. Ei fak ta chupchap chilo.
 *
 * Ekhon `revokeRefreshTokens` daka hoy. `readSession()` age
 * theke i `verifySessionCookie(raw, true)` kore - oi `true` ta
 * mane "bati kora hoyeche kina Firebase e giye dekho". Duita ek
 * shathe mile logout ta SOTTI logout hoy.
 */
export async function POST(req: NextRequest) {
  /* Onno pata theke daka jabe na - dekhun lib/server/same-origin.ts */
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  /* Cookie ta AGE mucha hoy. Niche Firebase e jete giye net
     gele-o jate manush oi browser e logout thaken. */
  store.delete(SESSION_COOKIE);

  if (raw) {
    try {
      const c = await adminAuth().verifySessionCookie(raw, false);
      await adminAuth().revokeRefreshTokens(c.uid);
    } catch {
      /* Cookie ta age theke i bhanga ba meyad-uttirno - kichhu
         korar nai, ar manush to logout hoye i gechen */
    }
  }

  return NextResponse.json({ ok: true });
}
