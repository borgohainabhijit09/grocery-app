import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { formatINR, ORDER_STATUS_LABELS, type OrderStatus } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ReorderButton } from "@/components/reorder-button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Package,
  Receipt,
  StickyNote,
  Truck,
} from "lucide-react";

type AddressSnapshot = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
};

const DELIVERY_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
];
const PICKUP_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "READY_FOR_PICKUP",
  "COMPLETED",
];

export const dynamic = "force-dynamic";
export const metadata = { title: "Order details" };

function paymentLabel(method: string, status: string) {
  const methodLabel = method === "RAZORPAY" ? "Online payment" : "Cash on delivery";
  const statusLabel =
    status === "PAID"
      ? "Paid"
      : status === "FAILED"
        ? "Failed"
        : status === "REFUNDED"
          ? "Refunded"
          : "Pending";
  return `${methodLabel} · ${statusLabel}`;
}

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
  const flow = order.fulfillmentType === "DELIVERY" ? DELIVERY_FLOW : PICKUP_FLOW;
  const currentIndex = flow.indexOf(order.status);
  const isTerminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Order #{order.orderNumber}</h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReorderButton orderId={order.id} />
          <Button asChild variant="outline" size="sm">
            <Link href="/account/orders">
              <ArrowLeft className="size-4" /> All orders
            </Link>
          </Button>
        </div>
      </div>

      {isTerminal ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-5",
            order.status === "CANCELLED"
              ? "border-red-200 bg-red-50"
              : "border-slate-200 bg-slate-50"
          )}
        >
          <OrderStatusBadge status={order.status} />
          <p className="text-sm text-muted-foreground">
            This order was {order.status === "CANCELLED" ? "cancelled" : "refunded"}. If you have
            questions, please contact the store.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <ol className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {flow.map((step, i) => {
              const done = i <= currentIndex;
              const isLastStep = i === flow.length - 1;
              return (
                <li key={step} className="flex min-w-[7rem] flex-1 flex-col gap-2">
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      {i < currentIndex ? <Check className="size-4" /> : i + 1}
                    </span>
                    {!isLastStep ? (
                      <span
                        className={cn(
                          "mx-1 h-0.5 flex-1 rounded",
                          i < currentIndex ? "bg-primary" : "bg-border"
                        )}
                      />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-tight",
                      done ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Package className="size-4" /> Items ({order.items.length})
            </h3>
            <ul className="mt-4 divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{it.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.variantLabel} · Qty {it.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">{formatINR(it.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatINR(order.subtotalPaise)}</dd>
              </div>
              {order.discountPaise > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd>-{formatINR(order.discountPaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>{order.deliveryFeePaise === 0 ? "Free" : formatINR(order.deliveryFeePaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd>{formatINR(order.taxPaise)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatINR(order.totalPaise)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Clock className="size-4" /> Order timeline
            </h3>
            <ol className="mt-4 space-y-4">
              {order.events.map((ev, i) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1 size-2.5 shrink-0 rounded-full",
                        i === order.events.length - 1 ? "bg-primary" : "bg-border"
                      )}
                    />
                    {i < order.events.length - 1 ? (
                      <span className="w-px flex-1 bg-border" />
                    ) : null}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium">
                      {ORDER_STATUS_LABELS[ev.status as OrderStatus]}
                    </p>
                    {ev.note ? (
                      <p className="text-xs text-muted-foreground">{ev.note}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              {order.fulfillmentType === "DELIVERY" ? (
                <Truck className="size-4" />
              ) : (
                <Package className="size-4" />
              )}
              {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Store pickup"}
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              {order.slot ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4 shrink-0" />
                  {new Date(order.slot.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {order.slot.startTime} – {order.slot.endTime}
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-4 shrink-0" />
                {paymentLabel(order.paymentMethod, order.paymentStatus)}
              </p>
              {order.deliveryPartner ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="size-4 shrink-0" />
                  {order.deliveryPartner.name}
                  {order.deliveryPartner.phone ? ` · ${order.deliveryPartner.phone}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          {snapshot ? (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="size-4" /> Delivery address
              </h3>
              <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{snapshot.fullName}</p>
                <p>{snapshot.phone}</p>
                <p>
                  {snapshot.line1}
                  {snapshot.line2 ? `, ${snapshot.line2}` : ""}
                </p>
                <p>
                  {snapshot.city}, {snapshot.state} - {snapshot.pincode}
                </p>
              </div>
            </div>
          ) : null}

          {order.notes ? (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <StickyNote className="size-4" /> Notes
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="size-4" /> Need help?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Questions about this order? Reach out and quote order #{order.orderNumber}.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/contact">
                <MapPin className="size-4" /> Contact store
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
