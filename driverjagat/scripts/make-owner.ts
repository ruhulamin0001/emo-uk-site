/**
 * Kauke MALIK ba ADMIN banano.
 *
 *   npm run make-owner -- ruhulsedu001@gmail.com
 *   npm run make-owner -- keu@gmail.com admin
 *
 * EI SCRIPT TA NA THAKLE PURO ADMIN PANEL ODARKARI CHILO.
 *
 * `requireStaff()` custom claim dekhe, ar claim SUDHU Admin SDK
 * boshate pare - browser theke na. Local e `DEV_SESSION` ekta
 * nokol malik dey, kintu ota `isEmulator()` hole tobei.
 *
 * Production e emulator nai. Mane asol server e KEU admin hote
 * parto na - job onumodon, malik jachai, taka - kichhu i
 * kora jeto na. Site ta cholto, kintu bhitore keu dhukte parto na.
 *
 * Ei script SUDHU jar kachhe service account key ache tini
 * chalate paren. Seta i pahara - alada kono password lage na.
 */

import { adminAuth, isEmulator } from '../src/lib/firebase/admin';
import { ROLE, type Role } from '../src/types/enums';

async function main() {
  const [email, roleArg] = process.argv.slice(2);

  if (!email) {
    console.error('\n  Kar email? Jemon:');
    console.error('    npm run make-owner -- apnar@email.com\n');
    process.exit(1);
  }

  const role: Role = roleArg === 'admin' ? ROLE.admin : ROLE.owner;

  if (isEmulator()) {
    console.log('\n   Emulator e cholche - asol project e kichhu hobe na.');
    console.log('     Production e chalate .env.local e NEXT_PUBLIC_USE_EMULATOR=false\n');
  }

  const auth = adminAuth();

  /**
   * User ta AGE THEKE thakte hobe.
   *
   * Ekhane notun user banai na - ekbar Google diye login korle
   * Firebase nijei banay. Ei script ekhane sudhu tar CLAIM bosay.
   *
   * Age na banale "ei email er keu nai" bola i thik - nahole
   * banan bhul thakle ekta bhoot account toiri hoto, ar asol
   * manush ta kokhono admin hoten na.
   */
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`\n  "${email}" - ei email e kono account nai.`);
    console.error('  AGE oi email diye ekbar site e login korun, tarpor');
    console.error('  ei script chalan.\n');
    process.exit(1);
  }

  const existing = (user.customClaims ?? {}) as Record<string, unknown>;

  await auth.setCustomUserClaims(user.uid, {
    ...existing,
    role,
    banned: false,
  });

  /**
   * Purono session gulo BATIL kore dei.
   *
   * Claim cookie te lekha hoy LOGIN ER MUHURTE. Ei ta na korle
   * tini abar login na kora porjonto purono claim niye ghurten - * ar bhabten script ta kaj kore ni.
   */
  await auth.revokeRefreshTokens(user.uid);

  console.log(`\n  ✓ ${email} ekhon ${role}`);
  console.log(`    uid: ${user.uid}`);
  console.log('\n  Ekhon ekbar LOGOUT kore abar LOGIN korun - ');
  console.log('     tobei notun khomota cookie te boshbe.\n');

  process.exit(0);
}

main().catch((e) => {
  console.error('\n  ' + (e instanceof Error ? e.message : String(e)) + '\n');
  process.exit(1);
});
