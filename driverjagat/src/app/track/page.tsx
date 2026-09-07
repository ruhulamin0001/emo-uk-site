import { TrackForm } from './TrackForm';

export const metadata = { title: 'পোস্টের খোঁজ' };

export default function TrackPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink-950">আপনার পোস্টের খোঁজ নিন</h1>
      <p className="mt-1 text-ink-600">
        জমা দেওয়ার সময় যে কোড পেয়েছিলেন, সেটি আর আপনার মোবাইল নম্বর দিন।
        লগইন লাগবে না।
      </p>
      <div className="mt-6">
        <TrackForm />
      </div>
    </main>
  );
}
