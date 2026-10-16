import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmed" };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { orderId } = await searchParams;
  if (!orderId) redirect("/account/orders");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== session.user.id) redirect("/account/orders");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Order placed successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">Order number: <span className="font-medium text-foreground">{order.orderNumber}</span></p>
          <p className="text-muted-foreground">Status: {ORDER_STATUS_LABELS[order.status]}</p>
          <p className="text-muted-foreground">Payment: {order.paymentMethod} · {order.paymentStatus}</p>
          <p className="text-lg font-semibold">Total: {formatINR(order.totalPaise)}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button asChild>
              <Link href={`/account/orders/${order.id}`}>View order</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
