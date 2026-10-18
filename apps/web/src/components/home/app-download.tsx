import { Apple, Smartphone } from "lucide-react";

const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "#";
const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "#";

export function AppDownload() {
  return (
    <section className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900 px-6 py-10 text-white sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-400/10 blur-2xl"
      />
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
          <Smartphone className="size-3.5" /> Fresh Basket app
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Order groceries on the go
        </h2>
        <p className="mt-3 max-w-md text-sm text-white/75">
          Faster reordering, live order tracking and exclusive app-only offers. Download the Fresh
          Basket app and get your daily essentials in a few taps.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={playStoreUrl}
            className="inline-flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-slate-900 transition hover:bg-white/90"
          >
            <PlayIcon />
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">Get it on</span>
              <span className="text-sm font-semibold">Google Play</span>
            </span>
          </a>
          <a
            href={appStoreUrl}
            className="inline-flex items-center gap-3 rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-white transition hover:bg-white/15"
          >
            <Apple className="size-7" />
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-white/60">Download on the</span>
              <span className="text-sm font-semibold">App Store</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
      <path fill="#00d3ff" d="M3.6 2.3 13.5 12 3.6 21.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Z" />
      <path fill="#00f076" d="m17 8.5-3.5 3.5L3.6 2.3c.2-.1.5-.1.8.1L17 8.5Z" />
      <path fill="#ffcf00" d="M17 15.5 4.4 21.6c-.3.2-.6.2-.8.1L13.5 12 17 15.5Z" />
      <path fill="#ff3a44" d="M20.3 10.4c.6.4 1 .9 1 1.6s-.4 1.2-1 1.6l-3.3 1.9L13.5 12 17 8.5l3.3 1.9Z" />
    </svg>
  );
}
