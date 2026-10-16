import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { calculatePricing, formatINR } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { CartLineControls } from "@/components/cart-line-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart" };

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/cart");

  const [cart, settings] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add some fresh groceries to get started.</p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.variant.pricePaise * item.quantity,
    0
  );

  const pricing = calculatePricing({
    subtotalPaise,
    deliveryFeePaise: settings?.deliveryFeePaise ?? 3000,
    freeDeliveryAbovePaise: settings?.freeDeliveryAbovePaise ?? null,
    taxRatePercent: settings?.taxRatePercent ?? 0,
    fulfillmentType: "DELIVERY",
  });

  const minOrder = settings?.minOrderValuePaise ?? 0;
  const belowMin = subtotalPaise < minOrder;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Your cart</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y rounded-xl border">
          {items.map((item) => {
            const p = item.variant.product;
            return (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-secondary">
                  {p.images[0] && (
                    <Image src={p.images[0]} alt={p.name} fill sizes="80px" className="object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link href={`/product/${p.slug}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">{item.variant.label}</span>
                  <span className="mt-1 text-sm">
                    {formatINR(item.variant.pricePaise)} / unit
                  </span>
                  <div className="mt-2">
                    <CartLineControls
                      variantId={item.variantId}
                      quantity={item.quantity}
                      maxQty={Math.max(1, Math.min(99, item.variant.stockQty))}
                    />
                  </div>
                </div>
                <div className="text-right font-semibold">
                  {formatINR(item.variant.pricePaise * item.quantity)}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-xl border p-5">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(pricing.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>
                {pricing.freeDeliveryApplied ? (
                  <span className="text-primary">Free</span>
                ) : (
                  formatINR(pricing.deliveryFeePaise)
                )}
              </dd>
            </div>
            {pricing.taxPaise > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatINR(pricing.taxPaise)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(pricing.totalPaise)}</dd>
            </div>
          </dl>

          {settings?.freeDeliveryAbovePaise ? (
            subtotalPaise >= settings.freeDeliveryAbovePaise ? (
              <p className="mt-3 text-xs text-primary">You&apos;ve unlocked free delivery.</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Add {formatINR(settings.freeDeliveryAbovePaise - subtotalPaise)} more for free
                delivery.
              </p>
            )
          ) : null}

          {belowMin && (
            <p className="mt-3 text-xs text-destructive">
              Minimum order is {formatINR(minOrder)}. Add{" "}
              {formatINR(minOrder - subtotalPaise)} more to checkout.
            </p>
          )}

          {settings?.acceptingOrders === false ? (
            <p className="mt-3 text-xs text-destructive">
              We are not accepting new orders right now. Please check back soon.
            </p>
          ) : null}

          {belowMin || settings?.acceptingOrders === false ? (
            <Button className="mt-4 w-full" disabled>
              Proceed to checkout
            </Button>
          ) : (
            <Button asChild className="mt-4 w-full">
              <Link href="/checkout">Proceed to checkout</Link>
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
