import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ReorderButton } from "@/components/reorder-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { placedAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">My orders</h2>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Button asChild className="mt-4">
            <Link href="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/account/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                    {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"} · {order.paymentMethod}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString("en-IN")}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatINR(order.totalPaise)}</span>
                  <ReorderButton orderId={order.id} />
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/account/orders/${order.id}`}>View details</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
