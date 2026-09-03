/**
 * Taka newar doraja - ekta CHUKTI, kono ekta company na.
 *
 * Kano ei alada stor ta?
 *
 * Malik AmaderPay bechhe niyechhen (D-04খ). Ami likhe rekhechilam
 * je ei ta ekta jhuki - choto gateway, ar kagoj-potro kom.
 * Malik jene sune siddhanto niyechhen, ar seta tar odhikar.
 *
 * Kintu jhuki thakle ekta ber howar rasta rakhte hoy. Ei
 * interface ta i sei rasta: AmaderPay bondho hoye gele, ba fee
 * baralе, ba kaj na korle - `amaderpay.ts` er jaygay
 * `sslcommerz.ts` boshiye deya jabe. Baki puro app er ekta line
 * o bodlabe na.
 *
 * Ei karone i app er kono jaygay "amaderpay" sobdo ta lekha nai - * sudhu ei folder er bhitore.
 */

import type { PaymentKind } from '@/types/enums';

/** Taka newar age ja jana dorkar */
export interface PaymentIntent {
  /** Amader NIJER id - provider er ta alada, ar seta pore ashe */
  paymentId: string;
  /** SERVER e hisheb kora. Client theke KOKHONO na. */
  amount: number;
  kind: PaymentKind;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  /** Taka deya sesh hole manush kothay firben */
  returnUrl: string;
  cancelUrl: string;
}

export type StartResult =
  | { ok: true; redirectUrl: string; providerRef?: string }
  | { ok: false; message: string };

/**
 * Ei ta provider er SATHE KOTHA BOLE janа hoy - callback e ja
 * likha ache ta PORE dekha hoy na.
 *
 * Karon: callback ta ekta URL. Je keu oi URL e
 * `?status=success&amount=49` likhe hit korte pare. Bishwas korle
 * keu ek poysa na diye verified hoye jeto.
 */
export type VerifyResult =
  | {
      ok: true;
      paid: boolean;
      /** Provider ja bolе ta - amader hishaber sathe MILIYE dekha hobe */
      amount: number;
      providerRef: string;
      raw: Record<string, unknown>;
    }
  | { ok: false; message: string };

export interface PaymentProvider {
  /** Nothi te lekha thake - kon provider diye taka ta esechilo */
  readonly id: string;
  readonly label: string;

  /** Taka newar pata toiri kore, manush ke sekhane pathate hobe */
  start(intent: PaymentIntent): Promise<StartResult>;

  /**
   * Sotti taka esechhe kina - provider ke jiggesh kore.
   *
   * DUITA id lage, ekta na.
   *
   * Amader nijer id (`paymentId`) ar tader id (`providerRef`) - * duita ALADA. AmaderPay er verify tader UUID chay, amader ta
   * chine na. Suru te ami sudhu amader ta pathatam, ar tate
   * KONO payment i jachai hoto na.
   *
   * @param ref      duita id
   * @param payload  callback e ja esechhe (ingit, proman na)
   */
  verify(
    ref: { paymentId: string; providerRef?: string },
    payload: Record<string, unknown>,
  ): Promise<VerifyResult>;
}
