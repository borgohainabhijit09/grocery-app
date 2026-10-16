import Link from "next/link";
import { prisma } from "database";
import { formatINR } from "shared";
import { requireDelivery } from "@/lib/auth-guard";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { DeliveryOrderActions } from "@/components/delivery/delivery-order-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "My deliveries" };

const OPEN_STATUSES = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"] as const;

type Snapshot = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  pincode?: string;
};

function shortAddress(snapshot: Snapshot | null) {
  if (!snapshot) return "Address unavailable";
  const parts = [snapshot.line1, snapshot.line2, snapshot.city, snapshot.pincode].filter(Boolean);
  return parts.join(", ");
}

export default async function DeliveryHomePage() {
  const me = await requireDelivery();

  const [open, delivered] = await Promise.all([
    prisma.order.findMany({
      where: {
        deliveryPartnerId: me.id,
        status: { in: [...OPEN_STATUSES] },
        fulfillmentType: "DELIVERY",
      },
      orderBy: { placedAt: "asc" },
      include: { slot: true, items: { select: { id: true } } },
      take: 50,
    }),
    prisma.order.findMany({
      where: { deliveryPartnerId: me.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { items: { select: { id: true } } },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">My deliveries</h1>
          <p className="text-sm text-muted-foreground">
            {open.length} active · {delivered.length} recently delivered
          </p>
        </div>
      </div>

      {open.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No active deliveries. You will see orders here once you are assigned.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {open.map((order) => {
            const snapshot = (order.addressSnapshot ?? null) as Snapshot | null;
            return (
              <Card key={order.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/delivery/orders/${order.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{shortAddress(snapshot)}</p>
                    <p className="text-sm text-muted-foreground">
                      {snapshot?.phone ?? "No phone"} · {order.items.length} items ·{" "}
                      {formatINR(order.totalPaise)}
                      {order.slot
                        ? ` · ${new Date(order.slot.date).toLocaleDateString("en-IN")} ${order.slot.startTime}–${order.slot.endTime}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <DeliveryOrderActions orderId={order.id} status={order.status} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/delivery/orders/${order.id}`}>Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {delivered.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recently delivered</h2>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Delivered</th>
                  <th className="px-4 py-2 font-medium">Items</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link href={`/delivery/orders/${order.id}`} className="hover:text-primary">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {order.completedAt
                        ? new Date(order.completedAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{order.items.length}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {formatINR(order.totalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
