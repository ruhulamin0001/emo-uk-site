import { Suspense } from 'react';
import { SignInPanel } from './SignInPanel';

export const metadata = { title: 'লগইন' };

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-950">লগইন</h1>
      <p className="mt-1 text-ink-600">ড্রাইভার চাই পোস্ট দিতে গাড়ির মালিকদের লগইন লাগে। ড্রাইভারদের লগইন লাগে না।</p>
      <div className="mt-6">
        {/* useSearchParams Suspense chay - nahole build e sotorkota */}
        <Suspense>
          <SignInPanel />
        </Suspense>
      </div>
    </main>
  );
}
