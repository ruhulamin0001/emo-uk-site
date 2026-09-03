import { NextResponse, type NextRequest } from 'next/server';
import { settlePayment } from '@/lib/server/payments';
import { isValidWebhookSignature } from '@/lib/payments/amaderpay';

/**
 * Gateway er webhook - taka jachai hole tara ei URL e hit koren.
 *
 * EI URL TA KHOLA. Login lage na, lagate parbo o na - gateway
 * er server hit kore, tader kachhe amader cookie nai.
 *
 * Tai ekhane ja pathano hoy tar KICHHU I bishwas kora hoy na.
 * Sudhu ekta id neya hoy, ar tarpor amra NIJERA gateway ke
 * jiggesh kori "ei payment ta ki sotti hoyeche?"
 *
 * Je keu ei URL e `?status=success` likhe hit korte pare - ar
 * tate kichhu i hobe na.
 *
 * AmaderPay er body (tader doc theke):
 *   { event: 'payment.verified', payment_id, order_id, amount, trx_id }
 *   header: x-signature: sha256=<hmac of raw body>
 *
 * `order_id` ta AMADER nijer payment id - start korar somoy
 * amra oitai pathiyechilam.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  let payload: Record<string, unknown> = Object.fromEntries(url.searchParams);

  if (req.method === 'POST') {
    /**
     * Raw text hishebe pori, JSON hishebe na.
     *
     * HMAC soi ta HUBAHU oi byte gulor upor kora. `req.json()`
     * kore abar `JSON.stringify` korle space ba key er kram
     * ektuo bodlale soi ta ar mile na.
     */
    const raw = await req.text().catch(() => '');

    if (raw) {
      const contentType = req.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        /* Soi na milleI ekhane i sesh - Firestore porjonto jay na */
        if (!isValidWebhookSignature(raw, req.headers.get('x-signature'))) {
          return NextResponse.json({ ok: false }, { status: 401 });
        }
        try {
          payload = { ...payload, ...JSON.parse(raw) };
        } catch {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
      } else {
        payload = {
          ...payload,
          ...Object.fromEntries(new URLSearchParams(raw)),
        };
      }
    }
  }

  /**
   * Amader nijer id.
   * `order_id` AGE dekha hoy - AmaderPay oitai pathay.
   * Baki nam gulo onno provider e bodlale kaje lagbe.
   */
  const paymentId = String(
    payload.order_id ??
      payload.merchant_invoice ??
      payload.invoice ??
      payload.id ??
      '',
  );

  if (!paymentId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = await settlePayment(paymentId, payload);

  /**
   * Gateway ke SOB SOMOY 200 deya hoy - bhitore ja i hok.
   *
   * Karon beshirbhag gateway 200 na pele bar bar cheshta kore,
   * ghonta dhore. Amader dik er somossa amader nothi te thakbe - * gateway ke bar bar dakiye labh nai.
   */
  return NextResponse.json({ ok: res.ok });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
