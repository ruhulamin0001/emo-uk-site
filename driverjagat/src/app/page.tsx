import Link from 'next/link';
import { FEES } from '@/config/business';
import { taka } from '@/lib/format';

/**
 * Landing - malik er design niyom:
 *   • prothom viewport ei hook
 *   • puro pitch EK scroll er moddhe
 *   • copy jeno AI-lekha na shonay, kono dash na
 */
export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold leading-snug text-ink-950 sm:text-4xl">
            বিশ্বাসযোগ্য ড্রাইভার খুঁজছেন?
            <br />
            <span className="text-brand-700">এখানে প্রতিটা ড্রাইভার আমরা নিজে যাচাই করি।</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-600">
            ফেসবুক গ্রুপের অচেনা নম্বর আর দালালের কমিশন বন্ধ। গাড়ির মালিক পোস্ট
            দেন, আগ্রহী ড্রাইভারদের লাইসেন্স আর অভিজ্ঞতা আমরা ফোনে মিলিয়ে নিই।
            দুই পক্ষ রাজি হলে আমরাই কথা বলিয়ে দিই।
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/jobs"
              className="rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-800"
            >
              ড্রাইভারের কাজ খুঁজুন
            </Link>
            <Link
              href="/post-job"
              className="rounded-lg border border-ink-200 bg-white px-6 py-3 font-semibold text-ink-800 hover:bg-ink-50"
            >
              ড্রাইভার চাই পোস্ট দিন
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-400">
            ড্রাইভারের জন্য সব ফ্রি। মালিকের পোস্ট ফি {taka(FEES.jobFee)}, আর
            নিয়োগ চূড়ান্ত হলে যোগাযোগ ফি {taka(FEES.connectionFee)}। দালালি নেই।
          </p>
        </div>
      </section>

      {/* ── Kivabe kaj kore ── */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold text-ink-950">যেভাবে কাজ হয়</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-brand-700">১</div>
            <h3 className="mt-2 font-semibold">মালিক পোস্ট দেন</h3>
            <p className="mt-1 text-sm text-ink-600">
              গাড়ির ধরন, বেতন, ডিউটি, থাকার ব্যবস্থা লিখে ফর্ম পূরণ করুন। আমাদের
              টিম ফোনে কথা বলে সব মিলিয়ে নেয়। ভুয়া পোস্ট এখানে ওঠে না।
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-brand-700">২</div>
            <h3 className="mt-2 font-semibold">ড্রাইভার আগ্রহ জানান</h3>
            <p className="mt-1 text-sm text-ink-600">
              কাজ পছন্দ হলে নাম, নম্বর, লাইসেন্স আর অভিজ্ঞতা দিন। লগইন লাগে
              না, টাকা লাগে না। মালিকের নম্বর খুঁজতে হয় না।
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-brand-700">৩</div>
            <h3 className="mt-2 font-semibold">রাজি হলে আমরাই মিলিয়ে দিই</h3>
            <p className="mt-1 text-sm text-ink-600">
              আমরা দুই পক্ষকে ফোন করি, লাইসেন্স আর অভিজ্ঞতা যাচাই করি। রাজি হলে
              ইন্টারভিউর দিন ঠিক করে নম্বর বিনিময় করিয়ে দিই।
            </p>
          </div>
        </div>
      </section>

      {/* ── Wada ── */}
      <section className="bg-brand-950 py-12 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold">কেন মানুষ আমাদের বিশ্বাস করে</h2>
          <ul className="mx-auto mt-6 max-w-xl list-disc space-y-3 pl-5 text-left text-brand-100">
            <li>প্রতিটি পোস্ট প্রকাশের আগে একজন মানুষ যাচাই করে। পুরনো বা ভুয়া পোস্ট থাকে না।</li>
            <li>মালিকের ঠিকানা আর ফোন নম্বর শুধু তখনই দেওয়া হয়, যখন দুই পক্ষই রাজি।</li>
            <li>কে আগ্রহ দেখালো, কয়জন দেখালো, মালিকও জানতে পারেন না। বেতন কমানোর খেলা চলে না।</li>
            <li>কোনো দালাল নেই, দালালি নেই। ফি মাত্র দুটো, দুটোই আগে থেকে লেখা।</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
