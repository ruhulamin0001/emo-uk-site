/**
 * Firebase Auth er authorized domains e domain jog kora - console
 * na khule, service account diye.
 *
 *   npx tsx --env-file=.env.production scripts/add-authorized-domain.ts driverjagat.com
 *
 * Karon: authorized domain e na thakle Google/Email-link login oi
 * domain theke KAJ KORE NA - "auth/unauthorized-domain" ashe.
 */

import { GoogleAuth } from 'google-auth-library';

async function main() {
  const domains = process.argv.slice(2);
  if (!domains.length) {
    console.error('babohar: add-authorized-domain.ts <domain> [aro...]');
    process.exit(1);
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL!,
      private_key: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

  const cur = await client.request<{ authorizedDomains?: string[] }>({ url: base });
  const existing = cur.data.authorizedDomains ?? [];
  console.log('ekhon ache:', existing.join(', '));

  const merged = [...new Set([...existing, ...domains])];
  if (merged.length === existing.length) {
    console.log('sob age thekei ache - kichhu bodlano holo na');
    return;
  }

  await client.request({
    url: `${base}?updateMask=authorizedDomains`,
    method: 'PATCH',
    data: { authorizedDomains: merged },
  });
  console.log('ekhon holo:', merged.join(', '));
}

main().catch((e) => {
  console.error('FAIL -', e instanceof Error ? e.message : e);
  process.exit(1);
});
