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
