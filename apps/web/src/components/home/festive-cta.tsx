import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FestiveCta({ code = "FRESH10" }: { code?: string }) {
  return (
    <section className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 px-6 py-8 text-white sm:px-10 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 right-24 size-32 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ring-white/30">
            <PartyPopper className="size-3.5" /> Festive season offer
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Celebrate with up to <span className="whitespace-nowrap">20% OFF</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm text-white/85">
            Stock up on festive essentials and save on your order. Apply the code at checkout.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/60 bg-white/10 px-3 py-1.5 text-sm font-semibold tracking-widest">
            USE CODE: {code}
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="bg-white text-rose-700 hover:bg-white/90"
        >
          <Link href="/shop">Shop the offer</Link>
        </Button>
      </div>
    </section>
  );
}
