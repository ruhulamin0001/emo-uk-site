import { NextResponse } from 'next/server';
import { runPaymentSweep } from '@/lib/server/lifecycle';
import { cronKeyOk } from '@/lib/server/cron-auth';

/**
 * Rojkar kaj - VPS er cron ei route ta daake.
 *
 * ⚠️ KANO route, script na?
 *
 * Runner image ta `output: 'standalone'` - okhane `/app/scripts`
 * bole kichhu NAI, ar `.ts` file plain node e chole na. Script
 * likhe crontab e bosale seta production e KONO DIN cholto na,
 * ar keu bujhto o na - jhaṛu na cholle kichhu bhange na, sudhu
 * atke thaka taka chupchap jomte thake.
 *
 * Ei route ta container er BHITORE chole - Firebase er chabi
 * okhane i ache. Cron sudhu curl kore.
 *
 * ⚠️ Pahara: `CRON_SECRET` header e hubohu milte hobe -
 * timingSafeEqual diye. Bhul hole 401, kono barta na.
 *
 * ⚠️ Dubar chalale khoti nai - `settlePayment` idempotent.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!cronKeyOk(req.headers.get('x-cron-key'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const started = Date.now();

  /**
   * ⚠️ `?task=payments` - SUDHU takar jhaṛu ta chalay (§৪গ).
   *
   * Kano alada lage: gateway er portal e Webhook URL er ghor
   * EKTA i. Mane ek account e onek site cholle SUDHU ekta site
   * webhook pay - bakider taka eshe o khobor ta pouchhay na.
   * Tader jonno ei jhaṛu ta ghon ghon (15 minute theke 1 ghonta)
   * chalate hoy.
   *
   * Puro rojkar kaj ta oto ghon ghon chalano JABE NA - se pore
   * SMS reminder pathabe, ar tokhon manush din e dosh ta SMS
   * peye number block kore diten. Tai takar tuku alada kore
   * daka jay.
   */
  const task = new URL(req.url).searchParams.get('task');

  if (task === 'payments') {
    const report = await runPaymentSweep();
    return NextResponse.json({
      ok: true,
      task: 'payments',
      report,
      tookMs: Date.now() - started,
    });
  }

  /* Ekhon rojkar kaj bolte oi jhaṛu tai - baki gulo pore ekhane boshbe */
  const report = await runPaymentSweep();
  return NextResponse.json({ ok: true, report, tookMs: Date.now() - started });
}
