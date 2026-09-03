import 'server-only';

/**
 * Haate haate taka - bKash / Nagad personal, ba sorasori.
 *
 * Ei ta "nokol provider" NA. Ei ta sotti kaje lagbe.
 *
 * Tin ta karone:
 *
 *   1. AmaderPay er key hate ashar AGE-o puro app ta cholte
 *      hobe - nahole baki sob kaj atke thakto.
 *
 *   2. Gateway bondho thakle (BD te hoy) taka newa bondho
 *      rakha jabe na. Tokhon ei ta chalu kore deya jay.
 *
 *   3. Onek sodossher online payment i nai. Grame bKash
 *      agent er dokan e giye taka pathan. Tader jonno ei ta
 *      chara r kono rasta nai.
 *
 * Ekhane provider nijei "taka esechhe" bole na - ADMIN bolen.
 * Tai `verify` kokhono nijer theke `paid: true` fera dey na.
 */

import type { PaymentIntent, PaymentProvider, StartResult, VerifyResult } from './types';

export const manualProvider: PaymentProvider = {
  id: 'manual',
  label: 'বিকাশ / নগদ - নিজে পাঠান',

  async start(intent: PaymentIntent): Promise<StartResult> {
    /**
     * Kono baire r site e jay na - nijeder ekta pata, jekhane
     * number ar ki likhte hobe ta lekha thake.
     *
     * paymentId ta URL e jay karon manush ke oi ta reference
     * hishebe likhte hobe - nahole ke taka pathiyeche mela jeto na.
     */
    return {
      ok: true,
      redirectUrl: `/payment/manual/${intent.paymentId}`,
    };
  },

  async verify(): Promise<VerifyResult> {
    /**
     * EI TA ICCHAKRITO - ekhane KOKHONO `paid: true` hoy na.
     *
     * Haate haate takar khetre "taka esechhe" ekmatro ADMIN
     * bolte paren, nijer bKash er lekha dekhe. Ei function ta
     * jodi kokhono `true` bolto, tahole je keu callback URL e
     * hit kore verified hoye jeto.
     *
     * Admin er "taka peyechi" button ta alada rasta - * lib/server/payments.ts er `markManuallyPaid`.
     */
    return {
      ok: true,
      paid: false,
      amount: 0,
      providerRef: 'manual',
      raw: {},
    };
  },
};
