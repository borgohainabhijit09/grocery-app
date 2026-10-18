import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Mark an order (and its payments) as paid. */
export const POST = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw NOT_FOUND("Order");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { paymentStatus: "PAID" } });
    await tx.payment.updateMany({ where: { orderId: id }, data: { status: "PAID" } });
  });

  return NextResponse.json({ ok: true });
});
