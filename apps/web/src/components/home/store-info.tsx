import Link from "next/link";
import { Clock, MapPin, Navigation, Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  latitude: number;
  longitude: number;
  nextPickup: { date: Date; startTime: string; endTime: string } | null;
};

function dayLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return target.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function StoreInfo({
  name,
  addressLine,
  city,
  state,
  pincode,
  phone,
  latitude,
  longitude,
  nextPickup,
}: Props) {
  const address = [addressLine, city, state, pincode].filter(Boolean).join(", ");
  const hasCoords = latitude !== 0 || longitude !== 0;
  const hasLocation = Boolean(address) || hasCoords;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Store className="size-3.5" /> Store &amp; pickup
          </span>
          <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prefer to collect in person? Order online and pick up at the store — no delivery fee.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {nextPickup ? (
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-primary" />
                <span>
                  Earliest pickup:{" "}
                  <span className="font-medium text-foreground">
                    {dayLabel(nextPickup.date)} · {nextPickup.startTime}–{nextPickup.endTime}
                  </span>
                </span>
              </li>
            ) : null}
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{address}</span>
              </li>
            ) : null}
            {phone ? (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-primary" />
                <a href={`tel:${phone}`} className="hover:underline">
                  {phone}
                </a>
              </li>
            ) : null}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/shop">Shop for pickup</Link>
            </Button>
            {hasLocation ? (
              <Button asChild variant="outline">
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="size-4" /> Get directions
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        {hasCoords ? (
          <div className="relative h-48 overflow-hidden rounded-2xl border bg-secondary lg:h-64">
            <iframe
              title={`${name} location`}
              src={embedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="relative hidden h-64 place-items-center overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50 to-emerald-100 lg:grid">
            <span className="text-5xl" aria-hidden="true">
              🏪
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
