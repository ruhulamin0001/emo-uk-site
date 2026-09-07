import { getSession } from '@/lib/server/auth';
import { JobForm } from './JobForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'ড্রাইভার চাই পোস্ট দিন' };

export default async function PostJobPage() {
  /* Middleware login pahara dey; session ekhane sudhu uid er jonno
     (chobi upload er Storage path e lage).
     "Age theke ekta ache" check NAI - ek malik er EKADHIK gari,
     ekadhik post kora jay. */
  const session = await getSession();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-950">ড্রাইভার চাই পোস্ট দিন</h1>
      <p className="mt-1 text-ink-600">
        জমার পর আমাদের টিম ফোনে কথা বলে যাচাই করবে, তারপর প্রকাশ হবে।
        আগ্রহী ড্রাইভারদের লাইসেন্স আর অভিজ্ঞতা আমরা মিলিয়ে তবেই আপনাকে জানাব।
      </p>
      <div className="mt-6">
        <JobForm uid={session?.uid ?? ''} />
      </div>
    </main>
  );
}
