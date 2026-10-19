import { redirect } from "next/navigation";
import { prisma } from "database";
import { isWithinRadius } from "shared";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/checkout");

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setUTCHours(0, 0, 0, 0); // match @db.Date UTC storage

  const [cart, addresses, rawSlots, settings, availableCoupons] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.slot.findMany({
      where: { isActive: true, date: { gte: todayMidnight } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: [{ minOrderPaise: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  const s = settings ?? {
    deliveryFeePaise: 3000,
    freeDeliveryAbovePaise: 50000,
    minOrderValuePaise: 10000,
    taxRatePercent: 0,
  };

  let subtotal = 0;
  for (const item of cart.items) {
    subtotal += item.variant.pricePaise * item.quantity;
  }

  const summary = {
    subtotalPaise: subtotal,
    deliveryFeePaise: s.deliveryFeePaise,
    discountPaise: 0,
    taxPaise: 0,
    totalPaise: subtotal,
  };

  const razorpayEnabled = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  const hasStoreLocation = Boolean(
    settings && (settings.latitude !== 0 || settings.longitude !== 0)
  );
  const center = settings ? { latitude: settings.latitude, longitude: settings.longitude } : null;
  const radiusKm = settings?.deliveryRadiusKm ?? 10;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you&apos;d like your order, pick a slot and confirm.
        </p>
      </div>
      <CheckoutForm
        addresses={addresses.map((a) => ({
          ...a,
          isDefault: a.isDefault,
          serviceable:
            !hasStoreLocation || !center
              ? true
              : isWithinRadius(center, { latitude: a.latitude, longitude: a.longitude }, radiusKm),
        }))}
        slots={rawSlots
          .map((sl) => ({
            id: sl.id,
            date: sl.date.toISOString().slice(0, 10), // @db.Date → UTC midnight → safe to slice
            startTime: sl.startTime,
            endTime: sl.endTime,
            fulfillmentType: sl.fulfillmentType,
          }))}
        settings={{
          deliveryFeePaise: s.deliveryFeePaise,
          freeDeliveryAbovePaise: s.freeDeliveryAbovePaise,
          minOrderValuePaise: s.minOrderValuePaise,
          taxRatePercent: s.taxRatePercent,
        }}
        cartSummary={summary}
        razorpayEnabled={razorpayEnabled}
        availableCoupons={availableCoupons
          .filter((c) => c.maxUses == null || c.usedCount < c.maxUses)
          .map((c) => ({
            code: c.code,
            description: c.description,
            type: c.type,
            value: c.value,
            minOrderPaise: c.minOrderPaise,
            maxDiscountPaise: c.maxDiscountPaise,
          }))}
      />
    </div>
  );
}
