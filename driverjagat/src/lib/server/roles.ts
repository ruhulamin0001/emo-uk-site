import 'server-only';

/**
 * Ke ki korte paren - ta bodlano.
 *
 * EI FILE TA NA THAKAY EKTA FAK CHILO.
 *
 * `OWNER_ONLY_ACTION.change_role` ghosona kora chilo, othocho
 * role bodlanor kono kod chilo na. Notun ekjon ke admin banate
 * hole `scripts/make-owner.ts` chalate hoto - mane terminal,
 * mane amake dakte hoto.
 *
 * Malik nijer lok ke nijei bosate parben na - seta ekta site er
 * jonno bhalo obostha na.
 *
 * DUITA JAYGAY LEKHA HOY, ar duitar kaj ALADA:
 *
 *   1. Firebase custom claim  → EI TA I ASOL KHOMOTA.
 *      `readSession()` ekhan theke i role pore. Ei ta na bosle
 *      manush ta kichhu i korte parben na.
 *
 *   2. `staff` collection      → sudhu TALIKA dekhanor jonno.
 *      Firebase Auth e "sob admin ke dao" bole kono query nai -
 *      sob user ghure dekhte hoto. 10,000 manush hole seta 10 ta
 *      round trip.
 *
 * Duita jaygay lekha mane duita bethik hote pare. Tai KHOMOTA
 * sob somoy claim theke, talika theke KOKHONO na. Talika bethik
 * hole sudhu ekta nam bhul dekhabe - keu baroti khomota paben na.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { writeLog } from './activity-log';
import { ROLE, isStaff, type Role } from '@/types/enums';
import type { Session } from './session';

export type RoleResult = { ok: true; message: string } | { ok: false; message: string };

export interface StaffMember {
  uid: string;
  email: string | null;
  name: string;
  role: Role;
  addedAt: number | null;
  addedBy: string | null;
}

const staffCol = () => adminDb().collection('staff');

/**
 * Ke ke ekhon admin ba malik.
 *
 * Ei talika ta `staff` collection theke, kintu protita nam er
 * role ta FIREBASE THEKE abar milie neya hoy.
 *
 * Kano: `staff` ekta nokol. Kono karone seta purono hoye gele
 * malik bhul talika dekhten - "Karim admin ache" bhabtenn,
 * othocho tar khomota kobe i tola hoyeche. Asol ta i dekhano hoy.
 */
export async function listStaff(): Promise<StaffMember[]> {
  const snap = await staffCol().get().catch(() => null);
  if (!snap || snap.empty) return [];

  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const uid = d.id;
      let role: Role = ROLE.user;
      let email: string | null = null;

      try {
        const u = await adminAuth().getUser(uid);
        role = ((u.customClaims?.role as Role | undefined) ?? ROLE.user);
        email = u.email ?? null;
      } catch {
        /* Account ta mucha hoyeche - talikay o thakbe na */
        return null;
      }

      if (!isStaff(role)) return null;

      return {
        uid,
        email: email ?? (d.get('email') as string | null) ?? null,
        name: String(d.get('name') ?? email ?? uid),
        role,
        addedAt: d.get('addedAt')?.toMillis?.() ?? null,
        addedBy: (d.get('addedBy') as string | null) ?? null,
      } satisfies StaffMember;
    }),
  );

  return rows
    .filter((r): r is StaffMember => r !== null)
    /* Malik age, tarpor nam dhore */
    .sort((a, b) =>
      a.role === b.role ? a.name.localeCompare(b.name, 'bn') : a.role === ROLE.owner ? -1 : 1,
    );
}

/**
 * Email diye ekjon ke khomota deya ba tola.
 *
 * @param role  `admin` ba `owner` dile khomota, `user` dile tola
 */
export async function setRole(
  email: string,
  role: Role,
  actor: Session,
): Promise<RoleResult> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, message: 'ইমেইল দিন' };

  /**
   * Notun account banano HOY NA.
   *
   * Banan bhul thakle ekta bhoot account toiri hoto, ar asol
   * manush ta kokhono admin hoten na - othocho talikay tar nam
   * dekhto. `make-owner.ts` eo ei ek i siddhanto.
   */
  let user;
  try {
    user = await adminAuth().getUserByEmail(clean);
  } catch {
    return {
      ok: false,
      message: 'এই ইমেইলে কোনো অ্যাকাউন্ট নেই। আগে একবার লগইন করতে বলুন।',
    };
  }

  /**
   * NIJER role NIJE bodlano jay NA.
   *
   * Malik nijeke `user` kore dile ar kono din admin panel e
   * dhukte parten na - ar tola r kono poth thakto na, karon
   * tolar botam ta i admin panel er bhitore.
   *
   * Ek jon i malik hole seta site ta chirokal er jonno tala
   * mere fela.
   */
  if (user.uid === actor.uid) {
    return { ok: false, message: 'নিজের ক্ষমতা নিজে বদলানো যায় না' };
  }

  const existing = (user.customClaims ?? {}) as Record<string, unknown>;
  const before = ((existing.role as Role | undefined) ?? ROLE.user);

  if (before === role) {
    return { ok: false, message: 'ইনি আগে থেকেই এই ক্ষমতায় আছেন' };
  }

  /* ASOL KHOMOTA - ei line ta na thakle kichhu i hoy na */
  await adminAuth().setCustomUserClaims(user.uid, { ...existing, role });

  /**
   * Purono session BATIL.
   *
   * Claim cookie te bose LOGIN ER MUHURTE. Ei ta na korle:
   *   • notun admin 14 din porjonto khomota peten na
   *   • ar aro kharap - SORANO admin 14 din porjonto khomota
   *     rekhe diten
   */
  await adminAuth().revokeRefreshTokens(user.uid);

  if (isStaff(role)) {
    await staffCol().doc(user.uid).set(
      {
        email: user.email ?? null,
        name: user.displayName ?? user.email ?? user.uid,
        role,
        addedAt: FieldValue.serverTimestamp(),
        addedBy: actor.uid,
      },
      { merge: true },
    );
  } else {
    await staffCol().doc(user.uid).delete().catch(() => {});
  }

  await writeLog(actor, {
    action: 'user.role_change',
    targetId: user.uid,
    changes: { role: [before, role] },
    note: clean,
  });

  return {
    ok: true,
    message: isStaff(role)
      ? `${clean} এখন ${role === ROLE.owner ? 'মালিক' : 'অ্যাডমিন'}। তাঁকে একবার লগআউট করে আবার লগইন করতে বলুন।`
      : `${clean} এর ক্ষমতা তুলে নেওয়া হয়েছে`,
  };
}
