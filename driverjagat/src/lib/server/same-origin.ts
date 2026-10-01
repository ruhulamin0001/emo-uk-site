import 'server-only';

import type { NextRequest } from 'next/server';

/**
 * Ei POST ta ki AMADER nijer pata theke elo?
 *
 * Kano ei ta lage?
 *
 * Amader duita khola API ache - `/api/auth/session` (login) ar
 * `/api/auth/signout`. Duitai POST, ar duitai cookie niye kaj
 * kore. Cookie ta `sameSite: 'lax'` - kintu `lax` ekta
 * cross-site POST ke ATKAY NA, sudhu tar sathe cookie pathay na.
 *
 * Mane onno kono pata ekta lukano form diye amader ei URL e
 * POST pathate parto:
 *
 *   • signout e - manush ke bar bar logout kore deya. Tini
 *     bhabten site ta bhanga.
 *
 *   • session e - aro kharap. Attacker NIJER token pathiye
 *     manush ke tar NIJER account e login koriye dito. Tarpor
 *     oi manush nijer NID er chobi, nijer thikana, nijer ৳49 - *     sob attacker er account e diye ditten, ar kichhu bujhten
 *     na.
 *
 * `Sec-Fetch-Site` protita adhunik browser pathay, ar javascript
 * diye bodlano jay na. Purono browser er jonno `Origin` ta o
 * dekha hoy.
 */
export function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');

  /* Adhunik browser - ei ek line i jothesto */
  if (site) return site === 'same-origin' || site === 'none';

  const origin = req.headers.get('origin');

  /**
   * Origin NA thakle CHALIYE deya hoy.
   *
   * Karon same-origin `fetch` e kono kono khetre `Origin` jay
   * na. Atkale asol manush login korte parten na - ar seta
   * ei pahara r cheye boro khoti.
   *
   * Cross-site POST e browser `Origin` SOB SOMOY pathay, tai
   * asol akromon ta ekhaneo atke jay.
   */
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
