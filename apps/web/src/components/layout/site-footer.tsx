import Link from "next/link";
import {
  Leaf,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { formatINR } from "shared";
import { getStoreSettings } from "@/lib/catalog";

const shopLinks = [
  { href: "/shop", label: "All products" },
  { href: "/category/all", label: "Browse categories" },
  { href: "/cart", label: "Your cart" },
  { href: "/account/orders", label: "Track your order" },
];

const accountLinks = [
  { href: "/account", label: "My account" },
  { href: "/account/orders", label: "My orders" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
];

export async function SiteFooter() {
  const settings = await getStoreSettings();
  const storeName = settings?.storeName ?? "Fresh Basket";
  const tagline =
    settings?.tagline ?? "Daily essentials, delivered fresh — home delivery slots or store pickup.";
  const address = [settings?.addressLine, settings?.city, settings?.state, settings?.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="mt-16 border-t bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Leaf className="size-5" />
              </span>
              <span className="text-lg font-semibold">{storeName}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{tagline}</p>

            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Truck className="size-4 shrink-0 text-primary" />
                Same-day delivery slots
              </li>
              <li className="flex items-center gap-2">
                <Store className="size-4 shrink-0 text-primary" />
                Free store pickup
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                Secure payments
              </li>
              {settings?.freeDeliveryAbovePaise ? (
                <li className="flex items-center gap-2">
                  <Truck className="size-4 shrink-0 text-primary" />
                  Free delivery above {formatINR(settings.freeDeliveryAbovePaise)}
                </li>
              ) : null}
            </ul>

            {settings?.contactPhone ? (
              <a
                href={`https://wa.me/${settings.contactPhone.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <MessageCircle className="size-4" />
                Chat with us on WhatsApp
              </a>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold">Shop</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {shopLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {accountLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Get in touch</p>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              {settings?.contactPhone ? (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-foreground">
                    {settings.contactPhone}
                  </a>
                </li>
              ) : null}
              {settings?.contactEmail ? (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {address ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{address}</span>
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <Store className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>Store pickup available during open hours.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <Leaf className="size-3.5 text-primary" />
            Fresh picks, fair prices.
          </p>
        </div>
      </div>
    </footer>
  );
}
