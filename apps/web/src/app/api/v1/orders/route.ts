import { NextResponse } from "next/server";
import { prisma } from "database";
import { ORDER_STATUSES, placeOrderSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serialize";
import { createOrder } from "@/lib/order-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in customer's orders. */
export const GET = route(async (request) => {
  const me = await requireApiUser(request);
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize") ?? 20) || 20));
  const statusParam = sp.get("status");
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as (typeof ORDER_STATUSES)[number])
    : undefined;

  const where = { userId: me.id, ...(status ? { status } : {}) };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: true, slot: true, deliveryPartner: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    items: orders.map(serializeOrder),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

/** Place an order from the cart. */
export const POST = route(async (request) => {
  const me = await requireApiUser(request);
  const input = await parseBody(placeOrderSchema, request);

  const result = await createOrder(me.id, input);
  if (!result.ok) throw new ApiError(400, result.error, result.fieldErrors);

  return NextResponse.json(
    { order: result.order, razorpay: result.razorpay ?? null },
    { status: 201 }
  );
});
