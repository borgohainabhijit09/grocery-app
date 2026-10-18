import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Order detail for the signed-in customer. */
export const GET = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      slot: true,
      deliveryPartner: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.userId !== me.id) throw NOT_FOUND("Order");

  return NextResponse.json({ order: serializeOrder(order) });
});
