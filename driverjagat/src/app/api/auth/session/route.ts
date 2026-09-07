import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/session-cookie';
import { sameOrigin } from '@/lib/server/same-origin';

/**
 * Browser er idToken → httpOnly session cookie.
 *
 * Cookie httpOnly, tai javascript theke pora jay NA. XSS
 * hole o session churi kora jabe na.
 *
 * Token ta SERVER e jachai kora hoy (`verifyIdToken`).
 * Client ja pathiyeche ta bishwas kori na - keu hate likha
 * token pathate pare.
 */
export async function POST(req: NextRequest) {
  /**
   * Onno pata theke daka jabe NA.
   *
   * Nahole ekta bhua pata attacker er NIJER token pathiye manush
   * ke ATTACKER ER account e login koriye dito. Tarpor oi manush
   * nijer kagoj, nijer thikana, nijer ৳49 - sob attacker er
   * account e diye ditten, ar kichhu bujhten na.
   *
   * `sameSite: 'lax'` ei ta ATKAY NA - ota sudhu cookie pathano
   * bondho kore, POST ta atkay na.
   */
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let idToken: string;
  try {
    const body = (await req.json()) as { idToken?: string };
    if (!body.idToken) throw new Error('no token');
    idToken = body.idToken;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    /* Token ta ekdom TATKHONIK hote hobe - 5 minute er purono
       token diye cookie banano jabe na. Nahole kothao theke faas
       hoye jawa purono token diye keu dhuke porte parto. */
    const ageSec = Date.now() / 1000 - decoded.auth_time;
    if (ageSec > 5 * 60) {
      return NextResponse.json(
        { ok: false, message: 'আবার লগইন করুন' },
        { status: 401 },
      );
    }

    const cookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
