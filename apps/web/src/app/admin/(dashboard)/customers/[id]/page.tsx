import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "database";
import { formatINR } from "shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/order-status-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPaise: true,
          paymentMethod: true,
          paymentStatus: true,
          placedAt: true,
        },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!customer) notFound();

  const spent = await prisma.order.aggregate({
    where: { userId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    _sum: { totalPaise: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            Joined {new Date(customer.createdAt).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/customers">Back to customers</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="break-all">{customer.email}</p>
            <div className="flex items-center gap-2">
              <span>{customer.phone ?? "No phone"}</span>
              {customer.phone ? (
                customer.phoneVerifiedAt ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )
              ) : null}
            </div>
            <p className="text-muted-foreground">Role: {customer.role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Orders:</span> {customer._count.orders}
            </p>
            <p>
              <span className="text-muted-foreground">Total spent:</span>{" "}
              {formatINR(spent._sum.totalPaise ?? 0)}
            </p>
            <p>
              <span className="text-muted-foreground">Addresses:</span> {customer.addresses.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {customer.addresses.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Addresses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {customer.addresses.map((a) => (
              <Card key={a.id}>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{a.label || "Address"}</p>
                    {a.isDefault ? <Badge variant="success">Default</Badge> : null}
                  </div>
                  <p className="mt-1">{a.fullName}</p>
                  <p>{a.phone}</p>
                  <p className="mt-2">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p>
                    {a.city}, {a.state} - {a.pincode}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}>View all</Link>
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Placed</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                customer.orders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(o.placedAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {o.paymentMethod} · {o.paymentStatus}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{formatINR(o.totalPaise)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
