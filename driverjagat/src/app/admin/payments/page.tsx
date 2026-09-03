import { requireOwnerPage } from '@/lib/server/auth';
import { getPendingPayments } from '@/lib/server/payments';
import { markPaidAction } from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';
import { PAYMENT_KIND_LABEL } from '@/types/enums';
import { taka, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * SUDHU MALIK. Taka "peyechi" bola ekta privileged kaj -
 * ekta chap e ekjon verified hoye jan.
 */
export default async function AdminPaymentsPage() {
  await requireOwnerPage();
  const rows = await getPendingPayments();

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">হাতে হাতে পাওয়া টাকার সারি</h1>
      <p className="text-sm text-ink-400">
        নিজের বিকাশে টাকা আর রেফারেন্স মিলিয়ে তারপর চাপ দিন। লেনদেন
        নম্বরটি লিখতেই হবে - পরে হিসাব না মিললে ওটিই একমাত্র সুতো।
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-ink-400">অপেক্ষমাণ কিছু নেই।</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white p-4"
            >
              <div>
                <div className="font-mono text-sm text-ink-400">
                  রেফারেন্স: {p.id.slice(0, 8)}
                </div>
                <div className="font-semibold">
                  {PAYMENT_KIND_LABEL[p.kind]} · {taka(p.amount)}
                </div>
                <div className="text-xs text-ink-400">{timeAgo(p.createdAt?.toMillis?.() ?? 0)}</div>
              </div>
              <AdminForm action={markPaidAction.bind(null, p.id)} className="flex items-start gap-2">
                <input
                  name="note"
                  required
                  placeholder="bKash লেনদেন নম্বর"
                  className="rounded-md border border-ink-200 px-2 py-2 text-sm"
                />
                <button className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white">
                  টাকা পেয়েছি
                </button>
              </AdminForm>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
