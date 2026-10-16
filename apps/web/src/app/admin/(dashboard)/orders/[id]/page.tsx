import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS } from "shared";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { AdminOrderActions } from "@/components/admin/admin-order-actions";
import { DeliveryAssign } from "@/components/admin/delivery-assign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [order, partners] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
        events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        address: true,
        slot: true,
        deliveryPartner: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DELIVERY" },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) notFound();

  const snapshot = (order.addressSnapshot ?? null) as null | {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    pincode?: string;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders">Back to orders</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{it.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.variantLabel}
                      {it.unit ? ` · ${it.unit}` : ""} · Qty {it.quantity} × {formatINR(it.pricePaise)}
                    </p>
                  </div>
                  <p className="font-medium">{formatINR(it.lineTotalPaise)}</p>
                </div>
              ))}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatINR(order.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatINR(order.discountPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{order.deliveryFeePaise === 0 ? "Free" : formatINR(order.deliveryFeePaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatINR(order.taxPaise)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatINR(order.totalPaise)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {order.payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">
                        {p.provider} · {p.method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.providerPaymentId ?? p.providerOrderId ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{formatINR(p.amountPaise)}</p>
                      <p className="text-xs text-muted-foreground">{p.status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <AdminOrderActions
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
          />

          {order.fulfillmentType === "DELIVERY" ? (
            <Card>
              <CardHeader>
                <CardTitle>Delivery partner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {order.deliveryPartner ? (
                  <div>
                    <p className="font-medium">{order.deliveryPartner.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.deliveryPartner.phone ?? "No phone on file"}
                      {order.assignedAt
                        ? ` · assigned ${new Date(order.assignedAt).toLocaleString("en-IN")}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not assigned yet.</p>
                )}
                <DeliveryAssign
                  orderId={order.id}
                  isDeliveryOrder
                  partners={partners}
                  currentPartnerId={order.deliveryPartnerId}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.user.name}</p>
              <p className="text-muted-foreground">{order.user.email}</p>
              <p className="text-muted-foreground">{order.user.phone ?? "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fulfillment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.fulfillmentType === "DELIVERY" ? "Delivery" : "Store pickup"}</p>
              {order.slot ? (
                <p className="text-muted-foreground">
                  {new Date(order.slot.date).toLocaleDateString("en-IN")} · {order.slot.startTime} – {order.slot.endTime}
                </p>
              ) : null}
              {order.fulfillmentType === "DELIVERY" ? (
                snapshot ? (
                  <div className="mt-2 text-muted-foreground">
                    <p>{snapshot.fullName}</p>
                    <p>{snapshot.phone}</p>
                    <p>
                      {snapshot.line1}
                      {snapshot.line2 ? `, ${snapshot.line2}` : ""}
                    </p>
                    <p>
                      {snapshot.city}, {snapshot.state} - {snapshot.pincode}
                    </p>
                  </div>
                ) : order.address ? (
                  <div className="mt-2 text-muted-foreground">
                    <p>{order.address.fullName}</p>
                    <p>{order.address.phone}</p>
                    <p>
                      {order.address.line1}
                      {order.address.line2 ? `, ${order.address.line2}` : ""}
                    </p>
                    <p>
                      {order.address.city}, {order.address.state} - {order.address.pincode}
                    </p>
                  </div>
                ) : null
              ) : null}
              {order.notes ? (
                <p className="mt-2 text-muted-foreground">Notes: {order.notes}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
