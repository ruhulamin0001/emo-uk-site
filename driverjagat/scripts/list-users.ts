/**
 * Firebase Auth e ke ke ache - debug er jonno.
 *   npx tsx --env-file=.env.production --conditions=react-server scripts/list-users.ts
 */
import { adminAuth } from '../src/lib/firebase/admin';

async function main() {
  const res = await adminAuth().listUsers(20);
  if (!res.users.length) {
    console.log('KONO user nai ekhono');
    return;
  }
  for (const u of res.users) {
    console.log(
      `${u.email ?? '(email nai)'} · providers: ${u.providerData.map((p) => p.providerId).join(',') || 'none'} · toiri: ${u.metadata.creationTime}`,
    );
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
