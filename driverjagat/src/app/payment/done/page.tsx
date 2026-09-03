import Link from 'next/link';
import { settlePayment } from '@/lib/server/payments';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'পেমেন্ট' };

/**
 * Gateway theke fire asha pata.
 *
 * Ekhane settlePayment daka NIRAPOD - se callback er moto i
 * kichhu bishwas kore na, provider ke jiggesh kore. Idempotent,
 * tai callback ar ei pata dui bar dakleo fol ekbar i ghote.
 */
export default async function PaymentDonePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const res = id ? await settlePayment(id) : null;

  const paid = res?.ok === true && res.paid;

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      {paid ? (
        <>
          <h1 className="text-2xl font-bold text-success">
            ফি পাওয়া গেছে, ধন্যবাদ
          </h1>
          <p className="mt-2 text-ink-600">
            আপনার পোস্ট এখন প্রকাশিত। আগ্রহী ড্রাইভার পেলে আমরা ফোন করব।
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-ink-950">
            পেমেন্ট এখনো নিশ্চিত হয়নি
          </h1>
          <p className="mt-2 text-ink-600">
            ব্যাংক বা গেটওয়ের দিক থেকে একটু সময় লাগতে পারে। কিছুক্ষণ পর
            ড্যাশবোর্ডে দেখুন, অথবা আমাদের জানান।
          </p>
        </>
      )}
      <Link
        href="/dashboard"
        className="mt-8 inline-block rounded-lg bg-brand-700 px-6 py-2.5 font-semibold text-white"
      >
        ড্যাশবোর্ডে ফিরুন
      </Link>
    </main>
  );
}
