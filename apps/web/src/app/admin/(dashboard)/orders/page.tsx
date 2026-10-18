import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "database";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "shared";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { OrdersTable } from "./_components/orders-table";

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

  const [orders, total, statusCounts, partners] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
        deliveryPartner: { select: { id: true, name: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { role: "DELIVERY", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.user.name,
    customerContact: o.user.phone ?? o.user.email,
    placedAt: o.placedAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    fulfillmentType: o.fulfillmentType,
    itemCount: o.items.length,
    partnerId: o.deliveryPartnerId,
    partnerName: o.deliveryPartner?.name ?? null,
    totalPaise: o.totalPaise,
  }));

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
      <PageHeader
        title="Orders"
        description={`${total} total`}
      >
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/orders/export" download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref({ status: undefined, page: "1" })}
          className={`rounded-full border px-3 py-1 text-sm ${!status ? "bg-secondary font-medium" : "hover:bg-accent"}`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: "1" })}
            className={`rounded-full border px-3 py-1 text-sm ${status === s ? "bg-secondary font-medium" : "hover:bg-accent"}`}
          >
            {ORDER_STATUS_LABELS[s]}
            {counts[s] ? <span className="ml-1 text-xs text-muted-foreground">{counts[s]}</span> : null}
          </Link>
        ))}
        <Link
          href={buildHref({ assign: unassigned ? undefined : "unassigned", page: "1" })}
          className={`rounded-full border px-3 py-1 text-sm ${unassigned ? "bg-secondary font-medium" : "hover:bg-accent"}`}
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

      <OrdersTable orders={rows} partners={partners} />

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
