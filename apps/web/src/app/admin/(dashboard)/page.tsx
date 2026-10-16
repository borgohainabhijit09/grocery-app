import Link from "next/link";
import { prisma } from "database";
import { formatINR } from "shared";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

async function getStats() {
  try {
    const [products, categories, orders, pending, lowStock, paidOrders, recentOrders] =
      await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.order.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.productVariant.count({ where: { stockQty: { lte: 5 } } }),
        prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalPaise: true } }),
        prisma.order.findMany({
          orderBy: { placedAt: "desc" },
          take: 5,
          include: { user: { select: { name: true } } },
        }),
      ]);
    return {
      products,
      categories,
      orders,
      pending,
      lowStock,
      revenuePaise: paidOrders._sum.totalPaise ?? 0,
      recentOrders,
      dbReady: true,
    };
  } catch {
    return {
      products: 0,
      categories: 0,
      orders: 0,
      pending: 0,
      lowStock: 0,
      revenuePaise: 0,
      recentOrders: [],
      dbReady: false,
    };
  }
}

export default async function AdminDashboardPage() {
  const s = await getStats();

  const cards = [
    { label: "Revenue (paid)", value: formatINR(s.revenuePaise) },
    { label: "Total orders", value: s.orders },
    { label: "Pending orders", value: s.pending },
    { label: "Products", value: s.products },
    { label: "Categories", value: s.categories },
    { label: "Low stock variants", value: s.lowStock },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {!s.dbReady && (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Database not reachable. Run migrations and seed to see live data.
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/orders">View all</Link>
        </Button>
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          {s.recentOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {s.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {o.user.name} · {new Date(o.placedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-sm font-medium">{formatINR(o.totalPaise)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
