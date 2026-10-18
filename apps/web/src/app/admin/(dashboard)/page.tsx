import Link from "next/link";
import { prisma } from "database";
import {
  AlertTriangle,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { ORDER_STATUS_LABELS, formatINR, type OrderStatus } from "shared";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { OrderStatusBadge, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
] as const;

type SearchParams = { range?: string };

function startOfDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function shortLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function pct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[1];
  const days = range.days;

  const now = new Date();
  const since = startOfDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const prevSince = startOfDay(new Date(since.getTime() - days * 86_400_000));

  const [
    currentPaid,
    prevPaid,
    currentOrders,
    prevOrders,
    newCustomers,
    prevNewCustomers,
    statusCounts,
    topItems,
    lowStock,
    pending,
    unassigned,
    recentOrders,
    productCount,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: "PAID", placedAt: { gte: since } },
      select: { placedAt: true, totalPaise: true },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", placedAt: { gte: prevSince, lt: since } },
      _sum: { totalPaise: true },
      _count: { _all: true },
    }),
    prisma.order.count({ where: { placedAt: { gte: since }, status: { not: "CANCELLED" } } }),
    prisma.order.count({
      where: { placedAt: { gte: prevSince, lt: since }, status: { not: "CANCELLED" } },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
    prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: prevSince, lt: since } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { placedAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: {
        order: { placedAt: { gte: since }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      },
      _sum: { quantity: true, lineTotalPaise: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      orderBy: { stockQty: "asc" },
      take: 8,
      select: {
        id: true,
        label: true,
        stockQty: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({
      where: {
        fulfillmentType: "DELIVERY",
        deliveryPartnerId: null,
        status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] },
      },
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
    prisma.product.count(),
  ]);

  const revenuePaise = currentPaid.reduce((sum, o) => sum + o.totalPaise, 0);
  const prevRevenuePaise = prevPaid._sum.totalPaise ?? 0;
  const prevPaidCount = prevPaid._count._all;
  const aovPaise = currentPaid.length ? Math.round(revenuePaise / currentPaid.length) : 0;
  const prevAovPaise = prevPaidCount ? Math.round(prevRevenuePaise / prevPaidCount) : 0;

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(isoDate(new Date(since.getTime() + i * 86_400_000)), 0);
  }
  for (const order of currentPaid) {
    const key = isoDate(order.placedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + order.totalPaise);
  }
  const trend = [...buckets.entries()].map(([label, value]) => ({
    label: shortLabel(label),
    value,
  }));

  const counts = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count._all])
  ) as Partial<Record<OrderStatus, number>>;
  const statusTotal = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  const lowStockRows = lowStock.filter(
    (v) => v.stockQty <= v.lowStockThreshold || v.stockQty <= 0
  );
  const shownLow = lowStockRows.length ? lowStockRows : lowStock;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Store performance for the last ${range.label}.`}>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin?range=${r.key}`}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                r.key === range.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatINR(revenuePaise)}
          delta={pct(revenuePaise, prevRevenuePaise)}
          icon={IndianRupee}
          hint="vs previous period"
        />
        <StatCard
          label="Orders"
          value={currentOrders}
          delta={pct(currentOrders, prevOrders)}
          icon={ShoppingCart}
          hint="vs previous period"
        />
        <StatCard
          label="Avg. order value"
          value={formatINR(aovPaise)}
          delta={pct(aovPaise, prevAovPaise)}
          icon={TrendingUp}
          hint="vs previous period"
        />
        <StatCard
          label="New customers"
          value={newCustomers}
          delta={pct(newCustomers, prevNewCustomers)}
          icon={Users}
          hint="vs previous period"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusTotal === 0 ? (
              <p className="text-sm text-muted-foreground">No orders in this period.</p>
            ) : (
              (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => {
                const count = counts[status] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ORDER_STATUS_LABELS[status]}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(4, share(count, statusTotal))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this period.</p>
            ) : (
              topItems.map((item) => (
                <div key={item.productName} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item._sum.quantity ?? 0} sold
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {formatINR(item._sum.lineTotalPaise ?? 0)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shownLow.length === 0 ? (
              <p className="text-sm text-muted-foreground">All variants are well stocked.</p>
            ) : (
              shownLow.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${v.product.id}`}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {v.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{v.label}</p>
                  </div>
                  <Badge variant={v.stockQty <= 0 ? "destructive" : "warning"}>
                    {v.stockQty <= 0 ? "Out" : `${v.stockQty} left`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/orders?status=PENDING"
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm">
                <ShoppingCart className="size-4 text-muted-foreground" />
                Pending orders
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{pending}</span>
                <StatusBadge tone="warning">Review</StatusBadge>
              </span>
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm">
                <Truck className="size-4 text-muted-foreground" />
                Unassigned deliveries
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">{unassigned}</span>
                <StatusBadge tone="info">Assign</StatusBadge>
              </span>
            </Link>
            <Link
              href="/admin/inventory"
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <span className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-muted-foreground" />
                Catalog
              </span>
              <span className="font-semibold">{productCount} products</span>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-primary">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.user.name} · {order.placedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatINR(order.totalPaise)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
