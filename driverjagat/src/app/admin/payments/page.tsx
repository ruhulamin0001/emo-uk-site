import { requireOwnerPage } from '@/lib/server/auth';
import { getPaymentsNeedingAttention, getPendingPayments } from '@/lib/server/payments';
import { clearPaymentAttentionAction, markPaidAction } from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';
import { PAYMENT_KIND_LABEL } from '@/types/enums';
import { taka, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * SUDHU MALIK. Taka "peyechi" bola ekta privileged kaj -
 * ekta chap e ekjon verified hoye jan.
 *
 * Duita sari ei pata te:
 *
 *   1. দেখা দরকার - taka ese atke geche (onko na mila, ferot
 *      dite hobe, ba approve er age eshechilo). Ei ta AGE, karon
 *      ekhane manuser taka amader kachhe ar se kichhu payni.
 *   2. হাতে হাতে - bKash e taka asar opekkha.
 */
export default async function AdminPaymentsPage() {
  await requireOwnerPage();
  const [stuck, rows] = await Promise.all([
    getPaymentsNeedingAttention(),
    getPendingPayments(),
  ]);

  return (
    <main>
      {stuck.length > 0 && (
        <section className="mb-10">
          <h1 className="text-xl font-bold text-danger">দেখা দরকার</h1>
          <p className="text-sm text-ink-400">
            এই টাকাগুলো এসেছে কিন্তু কাজ হয়নি। গেটওয়ের পাতায় মিলিয়ে
            দেখে ফেরত দিন বা ঠিক করুন, তারপর কী করলেন সেটা লিখে নামান।
          </p>

          <div className="mt-4 space-y-3">
            {stuck.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger bg-danger-bg p-4"
              >
                <div>
                  <div className="font-mono text-sm text-ink-400">
                    রেফারেন্স: {p.id.slice(0, 8)}
                    {p.providerRef ? ` · ${p.providerRef}` : ''}
                  </div>
                  <div className="font-semibold">
                    {PAYMENT_KIND_LABEL[p.kind]} · {taka(p.amount)}
                  </div>
                  {/* KENO atkeche - ei line ta i ei sari r puro karon */}
                  <div className="text-sm font-medium text-danger">{p.note}</div>
                  <div className="text-xs text-ink-400">
                    {p.providerId} · {timeAgo(p.createdAt?.toMillis?.() ?? 0)}
                  </div>
                </div>
                <AdminForm
                  action={clearPaymentAttentionAction.bind(null, p.id)}
                  className="flex items-start gap-2"
                >
                  <input
                    name="note"
                    required
                    placeholder="কী করলেন - ফেরত দিলাম / মিলিয়ে দেখলাম"
                    className="w-56 rounded-md border border-ink-200 px-2 py-2 text-sm"
                  />
                  <button className="rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-white">
                    দেখেছি
                  </button>
                </AdminForm>
              </div>
            ))}
          </div>
        </section>
      )}

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
