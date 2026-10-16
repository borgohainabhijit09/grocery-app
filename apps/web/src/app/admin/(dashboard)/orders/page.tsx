import Link from "next/link";
import { prisma } from "database";
import { formatINR, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "shared";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const PAGE_SIZE = 15;

type SearchParams = { status?: string; q?: string; page?: string; assign?: string };

function isOrderStatus(v: string | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as readonly string[]).includes(v);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = isOrderStatus(sp.status) ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const unassigned = sp.assign === "unassigned";

  const where = {
    ...(status ? { status } : {}),
    ...(unassigned ? { deliveryPartnerId: null } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { phone: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [orders, total, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
        deliveryPartner: { select: { name: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const counts = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count._all])
  ) as Partial<Record<OrderStatus, number>>;

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      status,
      q,
      page: String(page),
      assign: unassigned ? "unassigned" : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref({ status: undefined, page: "1" })}
          className={`rounded-md border px-3 py-1 text-sm ${!status ? "bg-secondary font-medium" : "hover:bg-accent"}`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: "1" })}
            className={`rounded-md border px-3 py-1 text-sm ${status === s ? "bg-secondary font-medium" : "hover:bg-accent"}`}
          >
            {ORDER_STATUS_LABELS[s]}
            {counts[s] ? <span className="ml-1 text-xs text-muted-foreground">{counts[s]}</span> : null}
          </Link>
        ))}
        <Link
          href={buildHref({ assign: unassigned ? undefined : "unassigned", page: "1" })}
          className={`rounded-md border px-3 py-1 text-sm ${unassigned ? "bg-secondary font-medium" : "hover:bg-accent"}`}
        >
          Unassigned
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/admin/orders" method="get">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {unassigned ? <input type="hidden" name="assign" value="unassigned" /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search order no, name, email, phone…"
          className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {q ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={buildHref({ q: undefined, page: "1" })}>Clear</Link>
          </Button>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Placed</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Delivery</th>
              <th className="px-4 py-2 font-medium">Payment</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t hover:bg-accent/40">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-primary">
                      {order.orderNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div>{order.user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.user.phone ?? order.user.email}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(order.placedAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {order.deliveryPartner
                      ? order.deliveryPartner.name
                      : order.fulfillmentType === "DELIVERY"
                        ? "—"
                        : "Pickup"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {order.paymentMethod} · {order.paymentStatus}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatINR(order.totalPaise)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: String(page - 1) })}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: String(page + 1) })}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
