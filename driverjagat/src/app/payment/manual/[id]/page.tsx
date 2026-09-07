import { notFound } from 'next/navigation';
import { getSession } from '@/lib/server/auth';
import { getPayment } from '@/lib/server/payments';
import { siteConfig } from '@/config/site';
import { taka } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'ফি পাঠান' };

/**
 * Haate haate bKash - gateway key na thakle ei pata i rasta.
 * Manush taka pathan, reference e payment id lekhen, admin
 * nijer bKash e dekhe "টাকা পেয়েছি" chapen (owner-only).
 */
export default async function ManualPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const payment = await getPayment(id);

  /* Nijer payment na hole dekha jay na */
  if (!payment || !session || payment.userId !== session.uid) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-950">বিকাশে ফি পাঠান</h1>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <ol className="list-decimal space-y-3 pl-5 text-ink-800">
          <li>
            বিকাশ অ্যাপ থেকে <strong>Send Money</strong> করুন এই নম্বরে:{' '}
            <strong className="font-mono">{siteConfig.support.phone.replace('+88', '')}</strong>
          </li>
          <li>
            পরিমাণ: <strong>{taka(payment.amount)}</strong>
          </li>
          <li>
            রেফারেন্সে লিখুন: <strong className="font-mono">{payment.id.slice(0, 8)}</strong>
          </li>
          <li>পাঠানোর পর আমাদের হোয়াটসঅ্যাপে লেনদেন নম্বরটি জানান।</li>
        </ol>

        <a
          href={`https://wa.me/${siteConfig.support.whatsapp}?text=${encodeURIComponent(
            `আসসালামু আলাইকুম। ফি পাঠিয়েছি। রেফারেন্স: ${payment.id.slice(0, 8)}`,
          )}`}
          className="mt-6 block rounded-lg bg-success py-2.5 text-center font-semibold text-white"
        >
          হোয়াটসঅ্যাপে জানান
        </a>

        <p className="mt-4 text-sm text-ink-400">
          টাকা মিলে গেলে আমাদের টিম নিশ্চিত করবে, আর আপনার পোস্ট
          প্রকাশিত হবে। সাধারণত কয়েক ঘণ্টার মধ্যে হয়ে যায়।
        </p>
      </div>
    </main>
  );
}
