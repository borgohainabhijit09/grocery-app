import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminCustomer } from "@/lib/api-admin-serialize";
import { serializeAddress, serializeOrder } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Customer detail with addresses and recent orders. */
export const GET = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 20,
        include: { items: true, slot: true, deliveryPartner: { select: { id: true, name: true } } },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!customer) throw NOT_FOUND("Customer");

  const spent = await prisma.order.aggregate({
    where: { userId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    _sum: { totalPaise: true },
  });

  return NextResponse.json({
    customer: serializeAdminCustomer(customer, spent._sum.totalPaise ?? 0),
    addresses: customer.addresses.map(serializeAddress),
    orders: customer.orders.map(serializeOrder),
  });
});
