import { NextResponse, type NextRequest } from 'next/server';
// '@/lib/server/session' theke ANBEN NA - ota Firebase Admin
// ane, ar Edge runtime e node:crypto nai. Middleware bhenge jabe.
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Pahara - kon pata login chara khola jabe na.
 *
 * Middleware SUDHU cookie ACHE kina dekhe, ta JACHAI kore NA.
 * Jachai er jonno Admin SDK lage, ar ota Edge runtime e chole na.
 *
 * Tai ei ta asol nirapotta NA - sudhu suvidha. Manush jeno
 * login pata dekhe, khali dashboard dekhe bhrom na kore.
 *
 * ASOL pahara protita Server Action o page er bhitore - * requireAuth() / requireStaff() (niyom #12). Ekhane phak thakleo
 * data faas hobe na.
 */
export function middleware(req: NextRequest) {
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasCookie) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/post-job/:path*',
  ],
};
