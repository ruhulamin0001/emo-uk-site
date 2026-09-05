/**
 * .env.production er admin credential SOTTI kaj kore kina.
 *
 *   npx tsx --env-file=.env.production --conditions=react-server scripts/check-prod-creds.ts
 *
 * SUDHU PORE - kichhu lekhe na. FIREBASE_PRIVATE_KEY er `\n`
 * escape ta i classic bhanga jayga - deploy er AGE ekhane dhora
 * poruk, VPS e giye na.
 */

import { adminAuth, adminDb, isEmulator } from '../src/lib/firebase/admin';

async function main() {
  if (isEmulator()) {
    console.error('NEXT_PUBLIC_USE_EMULATOR=true - ei test PRODUCTION env diye chalan');
    process.exit(1);
  }

  const snap = await adminDb().collection('counters').limit(1).get();
  console.log(`PASS  Firestore porlo (counters e ${snap.size} ta doc)`);

  const users = await adminAuth().listUsers(1);
  console.log(`PASS  Auth admin API cholche (${users.users.length} ta user dekha gelo)`);

  console.log('\nCredential thik ache - deploy kora jabe.');
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL -', e instanceof Error ? e.message : e);
  process.exit(1);
});
