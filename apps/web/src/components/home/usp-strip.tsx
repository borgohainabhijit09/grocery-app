import { BadgeCheck, Clock, ShieldCheck, Truck } from "lucide-react";
import { formatINR } from "shared";

export function UspStrip({ freeDeliveryAbovePaise }: { freeDeliveryAbovePaise?: number | null }) {
  const items = [
    {
      icon: Truck,
      title: "Free delivery",
      sub: freeDeliveryAbovePaise ? `On orders over ${formatINR(freeDeliveryAbovePaise)}` : "On eligible orders",
    },
    { icon: Clock, title: "Same-day slots", sub: "Delivered at your convenience" },
    { icon: BadgeCheck, title: "Freshness guarantee", sub: "Quality checked daily" },
    { icon: ShieldCheck, title: "Secure payments", sub: "UPI, cards & cash on delivery" },
  ];

  return (
    <section className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-4 sm:p-5">
      {items.map((it) => (
        <div key={it.title} className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <it.icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{it.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{it.sub}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
