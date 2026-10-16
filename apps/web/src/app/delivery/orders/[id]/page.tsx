import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS } from "shared";
import { requireDelivery } from "@/lib/auth-guard";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { DeliveryOrderActions } from "@/components/delivery/delivery-order-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delivery details" };

type Snapshot = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
};

export default async function DeliveryOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireDelivery();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      slot: true,
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      deliveryPartner: { select: { id: true, name: true } },
    },
  });

  if (!order) notFound();
  if (me.role === "DELIVERY" && order.deliveryPartnerId !== me.id) redirect("/delivery");

  const snapshot = (order.addressSnapshot ?? null) as Snapshot | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          <DeliveryOrderActions orderId={order.id} status={order.status} size="default" />
          <Button asChild variant="outline" size="sm">
            <Link href="/delivery">Back</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Drop-off details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {snapshot ? (
              <div>
                <p className="font-medium">{snapshot.fullName}</p>
                <p className="text-muted-foreground">{snapshot.phone}</p>
                <p className="text-muted-foreground">
                  {snapshot.line1}
                  {snapshot.line2 ? `, ${snapshot.line2}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {snapshot.city}, {snapshot.state} - {snapshot.pincode}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Address unavailable.</p>
            )}
            {order.slot ? (
              <p className="text-muted-foreground">
                Slot: {new Date(order.slot.date).toLocaleDateString("en-IN")} ·{" "}
                {order.slot.startTime} – {order.slot.endTime}
              </p>
            ) : null}
            {order.notes ? <p className="text-muted-foreground">Notes: {order.notes}</p> : null}
            <p className="text-muted-foreground">
              Payment: {order.paymentMethod} · {order.paymentStatus}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{it.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.variantLabel} · Qty {it.quantity}
                  </p>
                </div>
                <p className="font-medium">{formatINR(it.lineTotalPaise)}</p>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span>{formatINR(order.totalPaise)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {order.events.map((ev) => (
            <div key={ev.id} className="flex items-start justify-between border-b pb-2 last:border-0">
              <div>
                <p className="font-medium">{ORDER_STATUS_LABELS[ev.status]}</p>
                {ev.note ? <p className="text-xs text-muted-foreground">{ev.note}</p> : null}
                {ev.actor?.name ? (
                  <p className="text-xs text-muted-foreground">by {ev.actor.name}</p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(ev.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
