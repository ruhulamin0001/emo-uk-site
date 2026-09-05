import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { cronKeyOk } from '@/lib/server/cron-auth';
import { manualProvider, isOnlinePaymentLive } from '@/lib/payments';
import { PAYMENT_STATUS } from '@/types/enums';
import { siteConfig } from '@/config/site';

/**
 * Ek nojore ei site er TAKAR SASTHYO - 5 ta platform ek jayga
 * theke dekhar jonno (§২ক).
 *
 * ⚠️ KANO ei ta lage?
 *
 * 5 ta site ek i gateway account e cholbe. Protita r obostha
 * janar jonno 5 bar SSH kore log dekhte hoto - ar seta keu
 * kokhono korto na. Na dekhle taka atke thakleo kono din jana
 * jeto na.
 *
 * Ekhon protita site ek i rokom ei ghor ta khule rakhe, ar
 * rojkar dekhar lok sudhu 5 ta URL dekhe ney.
 *
 * ⚠️ Ei ta PORE, KICHHU BODLAY NA.
 *
 * Gateway ke o jiggesh kore na - sudhu nijer Firestore gone.
 * Karon ei ta "kemon achho" prosno, "kaj koro" na. Kaj ta kore
 * `?task=payments`. Duita mishiye felle ekta swastho-poriksha
 * nijei taka bodle dito, ar tokhon "dekha" ar "kora" r majhe
 * kono farak thakto na.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!cronKeyOk(req.headers.get('x-cron-key'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = Date.now();
  const DAY = 24 * 3600_000;

  const snap = await adminDb()
    .collection('payments')
    .where('status', '==', PAYMENT_STATUS.pending)
    .orderBy('createdAt', 'asc')
    .limit(200)
    .get();

  let pendingManual = 0;
  let pendingGateway = 0;
  let stuckOver24h = 0;
  let oldestGatewayHours = 0;

  for (const doc of snap.docs) {
    if (doc.get('providerId') === manualProvider.id) {
      pendingManual++;
      continue;
    }

    pendingGateway++;
    const age = now - (doc.get('createdAt')?.toMillis?.() ?? now);
    if (age > DAY) stuckOver24h++;
    oldestGatewayHours = Math.max(oldestGatewayHours, age / 3600_000);
  }

  return NextResponse.json({
    /* ⚠️ Kon site - 5 ta report pashapashi rakhle ei ta i chene */
    site: siteConfig.trackingPrefix,
    domain: siteConfig.domain,
    /* Online na haate haate - kon obosthay ache */
    mode: isOnlinePaymentLive() ? 'gateway' : 'manual',
    /**
     * ⚠️ EI SONKHYA TA I ROG NIRNOY. 0 chhara kichhu mane kichhu
     * ekta bhanga - phone bondho, app ghumacche, gateway pore
     * gechhe, ba SIM e network nai.
     */
    stuckOver24h,
    pendingGateway,
    /* Malik er nijer haate settle korar sari - ei ta 0 na holeo thik */
    pendingManual,
    oldestGatewayHours: Math.round(oldestGatewayHours * 10) / 10,
    ok: stuckOver24h === 0,
    checkedAt: new Date().toISOString(),
  });
}
