import { requireOwnerPage } from '@/lib/server/auth';
import { banAction, unbanAction } from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';

export const dynamic = 'force-dynamic';

/**
 * SUDHU MALIK. Ban mane: claim + revokeRefreshTokens (session
 * EKHON i more), SOB basha feed theke name jay.
 * Banned manush ke kono barta jay na - icchakrito.
 */
export default async function AdminModerationPage() {
  await requireOwnerPage();

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">নিষেধাজ্ঞা</h1>

      <section className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-danger">নিষিদ্ধ করুন</h2>
        <p className="text-xs text-ink-400">
          সাথে সাথে সেশন মরে যাবে, তার সব পোস্ট ফিড থেকে নেমে যাবে।
          কোনো বার্তা যাবে না।
        </p>
        <AdminForm action={banAction} className="mt-3 flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white">
            নিষিদ্ধ করুন
          </button>
        </AdminForm>
      </section>

      <section className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="font-semibold">নিষেধাজ্ঞা তুলুন</h2>
        <p className="text-xs text-ink-400">
          আগের অবস্থায় ফিরে যাবেন (statusBeforeBan)। পোস্টগুলো ফেরাতে হলে
          আলাদাভাবে দেখুন।
        </p>
        <AdminForm action={unbanAction} className="mt-3 flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-ink-800 px-4 py-2 text-sm font-semibold text-white">
            তুলে নিন
          </button>
        </AdminForm>
      </section>
    </main>
  );
}
