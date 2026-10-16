import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AddressSnapshot = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
};

export const dynamic = "force-dynamic";
export const metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      address: true,
      slot: true,
      deliveryPartner: { select: { name: true, phone: true } },
    },
  });

  if (!order || order.userId !== session.user.id) redirect("/account/orders");

  const snapshot = (order.addressSnapshot ?? null) as AddressSnapshot | null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {new Date(order.placedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status & payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Status: {ORDER_STATUS_LABELS[order.status]}</p>
          <p>Fulfillment: {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}</p>
          <p>Payment: {order.paymentMethod} · {order.paymentStatus}</p>
          {order.deliveryPartner ? (
            <p>
              Delivery partner: {order.deliveryPartner.name}
              {order.deliveryPartner.phone ? ` · ${order.deliveryPartner.phone}` : ""}
            </p>
          ) : null}
          {order.slot ? (
            <p>
              Slot: {new Date(order.slot.date).toLocaleDateString("en-IN")} · {order.slot.startTime} – {order.slot.endTime}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {order.address || snapshot ? (
        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {snapshot ? (
              <>
                <p>{snapshot.fullName}</p>
                <p>{snapshot.phone}</p>
                <p>
                  {snapshot.line1}
                  {snapshot.line2 ? `, ${snapshot.line2}` : ""}
                </p>
                <p>
                  {snapshot.city}, {snapshot.state} - {snapshot.pincode}
                </p>
              </>
            ) : order.address ? (
              <>
                <p>{order.address.fullName}</p>
                <p>{order.address.phone}</p>
                <p>
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                </p>
                <p>
                  {order.address.city}, {order.address.state} - {order.address.pincode}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div>
                <p className="font-medium">{it.productName}</p>
                <p className="text-xs text-muted-foreground">{it.variantLabel}</p>
                <p className="text-xs text-muted-foreground">Qty: {it.quantity}</p>
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

      {order.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{order.notes}</CardContent>
        </Card>
      ) : null}

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
              </div>
              <p className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleString("en-IN")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
