import { redirect } from "next/navigation";
import { prisma } from "database";
import { auth } from "@/auth";
import { RazorpayCheckout } from "@/components/checkout/razorpay-checkout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Complete payment" };

export default async function RazorpayPage({ searchParams }: { searchParams: Promise<{ orderId?: string; rzpOrderId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { orderId, rzpOrderId } = await searchParams;
  if (!orderId || !rzpOrderId) redirect("/cart");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: { where: { providerOrderId: rzpOrderId } } },
  });

  if (!order || order.userId !== session.user.id) redirect("/account/orders");
  if (order.paymentStatus === "PAID") redirect(`/checkout/success?orderId=${orderId}`);
  if (order.payments.length === 0) redirect("/checkout/success?orderId=" + orderId);

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Complete your payment</h1>
      <p className="mt-2 text-sm text-muted-foreground">Order {order.orderNumber}</p>
      <div className="mt-6">
        <RazorpayCheckout orderId={orderId} rzpOrderId={rzpOrderId} />
      </div>
    </div>
  );
}
