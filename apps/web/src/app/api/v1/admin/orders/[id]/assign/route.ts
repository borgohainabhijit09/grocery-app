import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { queueNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  partnerId: z.string().min(1).nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Assign (or clear) the delivery partner on an order. */
export const POST = route(async (request, ctx: Ctx) => {
  const staff = await requireStaffApi(request);
  const { id } = await ctx.params;
  const { partnerId } = await parseBody(schema, request);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw NOT_FOUND("Order");
  if (order.fulfillmentType !== "DELIVERY") {
    throw new ApiError(400, "Only delivery orders can be assigned to a delivery partner.");
  }

  let partnerName: string | undefined;
  if (partnerId) {
    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    if (!partner || partner.role !== "DELIVERY" || !partner.isActive) {
      throw new ApiError(400, "Delivery partner not found.");
    }
    partnerName = partner.name;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { deliveryPartnerId: partnerId ?? null, assignedAt: partnerId ? new Date() : null },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        status: order.status,
        note: partnerId ? `Assigned to ${partnerName}` : "Delivery assignment removed",
        actorId: staff.id,
      },
    });
  });

  if (partnerId && partnerName) {
    await queueNotification({
      userId: partnerId,
      template: "order_assigned",
      payload: { orderId: id, orderNumber: order.orderNumber, recipientName: partnerName },
    });
  }

  return NextResponse.json({ ok: true });
});
