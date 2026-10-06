import { VerifyPanel } from './VerifyPanel';

export const metadata = { title: 'লগইন হচ্ছে' };

export default function VerifyPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-950">লগইন</h1>
      <div className="mt-6">
        <VerifyPanel />
      </div>
    </main>
  );
}
