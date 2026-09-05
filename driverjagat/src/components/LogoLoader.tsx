/**
 * Loading obosthay logo r mark (public/icon.svg) dekhay - malik chan
 * shob loading page e brand er chinho thakuk (3 Sep 2026).
 * Prottek route segment er loading.tsx ei component tai bosay.
 */
export function LogoLoader() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="h-16 w-16 animate-pulse" />
      <p className="text-sm text-ink-400">লোড হচ্ছে...</p>
    </div>
  );
}
