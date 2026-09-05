import 'server-only';

/**
 * Kon provider diye taka nebo - ek jaygay siddhanto.
 *
 * App er baki kono jaygay `amaderpay` ba `manual` sobdo ta
 * lekha nai. Sob jayga sudhu `activeProvider()` chene.
 *
 * Ei ek jayga ta i bodlale gateway bodle jay.
 */

import { amaderPayProvider, isAmaderPayReady } from './amaderpay';
import { manualProvider } from './manual';
import type { PaymentProvider } from './types';

/**
 * NIYOM #10 er doraja.
 *
 * Ei file er UPORE gateway er nam lekha ache - ei ek jaygay i.
 * Ei line er niche ja ache, ar app er baki SOB, sudhu
 * `activeProvider()` / `providerById()` / `verifyWebhookSignature()`
 * chene. Gateway bodlale: uporer import ta ar `amaderpay.ts` -
 * baki app er ekta line o bodlabe na.
 */

export type { PaymentIntent, PaymentProvider, StartResult, VerifyResult } from './types';

/**
 * Ek matro `manualProvider` ta baire jay - `getPendingPayments()`
 * er "haate haate takar sari" ta chena r jonno. Baki kothao
 * provider er nam lekha nai.
 */
export { manualProvider };

/**
 * Key na thakle nijei `manual` e chole jay - bhange na.
 *
 * Ei ta guruttopurno: AmaderPay er key hate ashar age-o app ta
 * puro cholbe, taka bKash e newa jabe. Key bosle nijei online
 * e chole jabe, kono code bodlate hobe na.
 */
export function activeProvider(): PaymentProvider {
  return isAmaderPayReady() ? amaderPayProvider : manualProvider;
}

/** Nothi te lekha id theke provider ta abar khuje ber kora */
export function providerById(id: string): PaymentProvider {
  if (id === amaderPayProvider.id) return amaderPayProvider;
  return manualProvider;
}

/** Manush ke dekhabo - "এখন বিকাশে পাঠাতে হবে" na "কার্ডে দিন" */
export const isOnlinePaymentLive = (): boolean => isAmaderPayReady();

/**
 * Webhook er soi mile kina - callback route ei ta i daake.
 *
 * NIYOM #10: callback route gateway er file SORASORI import
 * kore na, ar tar kono comment e gateway er nam nai. Se sudhu
 * ei function ta chene.
 *
 * NIYOM #2 mone rakhben: soi milleO amra kichhu BISHWAS kori na.
 * Ei ta sudhu sosta prothom chhakni - asol jachai `verify()`,
 * jekhane amra NIJERA provider ke giye jiggesh kori.
 *
 * Provider soi milano na janle (`verifySignature` nai) `true`
 * fera hoy - karon takhon o asol pahara `verify()` tai thake.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const provider = activeProvider();
  return provider.verifySignature?.(rawBody, signature) ?? true;
}
