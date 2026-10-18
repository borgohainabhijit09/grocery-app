import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Admin order detail incl. timeline, payments, address and assignable partners. */
export const GET = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const [order, partners] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        events: {
          orderBy: { createdAt: "asc" },
          include: { actor: { select: { name: true } } },
        },
        payments: { orderBy: { createdAt: "desc" } },
        address: true,
        slot: true,
        deliveryPartner: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DELIVERY" },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) throw NOT_FOUND("Order");

  const base = serializeOrder(order);

  return NextResponse.json({
    order: {
      ...base,
      events: order.events.map((ev) => ({
        id: ev.id,
        status: ev.status,
        note: ev.note,
        actorName: ev.actor?.name ?? null,
        createdAt: ev.createdAt.toISOString(),
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        method: p.method,
        status: p.status,
        amountPaise: p.amountPaise,
        providerOrderId: p.providerOrderId,
        providerPaymentId: p.providerPaymentId,
        createdAt: p.createdAt.toISOString(),
      })),
      address: order.address,
      deliveryPartnerId: order.deliveryPartnerId,
    },
    partners,
  });
});
