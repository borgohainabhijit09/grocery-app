import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin dashboard stats. */
export const GET = route(async (request) => {
  await requireStaffApi(request);

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

  return NextResponse.json({
    stats: {
      products,
      categories,
      orders,
      pending,
      lowStock,
      revenuePaise: paidOrders._sum.totalPaise ?? 0,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalPaise: o.totalPaise,
      customerName: o.user?.name ?? "—",
      placedAt: o.placedAt.toISOString(),
    })),
  });
});
