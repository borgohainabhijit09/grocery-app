import { redirect } from "next/navigation";
import { prisma } from "database";
import { formatINR } from "shared";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/checkout");

  const [cart, addresses, slots, settings] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.slot.findMany({
      where: { isActive: true, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-6 space-y-6">
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">Cart total</p>
          <p className="text-muted-foreground">{formatINR(subtotal)}</p>
        </div>
        <CheckoutForm
          addresses={addresses.map((a) => ({ ...a, isDefault: a.isDefault }))}
          slots={slots.map((sl) => ({
            id: sl.id,
            date: sl.date.toISOString(),
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
        />
      </div>
    </div>
  );
}
