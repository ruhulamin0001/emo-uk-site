import { requireOwnerPage } from '@/lib/server/auth';
import { listStaff } from '@/lib/server/roles';
import { setRoleAction } from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';
import { ROLE, ROLE_LABEL } from '@/types/enums';

export const dynamic = 'force-dynamic';

/**
 * Talika ta `staff` collection theke, kintu ASOL khomota
 * custom claim e - listStaff() protita nam Firebase theke milie
 * ney. Role bodlano SUDHU malik.
 */
export default async function AdminStaffPage() {
  await requireOwnerPage();
  const staff = await listStaff();

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">টিম</h1>

      <div className="mt-4 rounded-lg border border-ink-200 bg-white">
        {staff.length === 0 ? (
          <p className="p-4 text-sm text-ink-400">
            তালিকা খালি। প্রথম মালিক টার্মিনাল থেকে বসাতে হয় (make-owner)।
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {staff.map((s) => (
              <li key={s.uid} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-ink-400">{s.email}</div>
                </div>
                <span className="rounded-full bg-ink-100 px-3 py-0.5 font-medium">
                  {ROLE_LABEL[s.role]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="mt-6 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="font-semibold">ক্ষমতা দিন বা তুলুন</h2>
        <p className="text-xs text-ink-400">
          যাকে দিচ্ছেন তাকে আগে অন্তত একবার লগইন করতে হবে। নিজের ক্ষমতা
          নিজে বদলানো যায় না।
        </p>
        <AdminForm action={setRoleAction} className="mt-3 flex flex-wrap items-start gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <select name="role" required defaultValue={ROLE.admin} className="rounded-md border border-ink-200 px-2 py-2 text-sm">
            <option value={ROLE.admin}>অ্যাডমিন করুন</option>
            <option value={ROLE.owner}>মালিক করুন</option>
            <option value={ROLE.user}>ক্ষমতা তুলে নিন</option>
          </select>
          <button className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
            প্রয়োগ করুন
          </button>
        </AdminForm>
      </section>
    </main>
  );
}
