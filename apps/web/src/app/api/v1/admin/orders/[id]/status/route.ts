import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { ORDER_STATUSES, ORDER_STATUS_FLOW, type OrderStatus } from "shared";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { queueNotification, processNotificationQueueSoon } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_TEMPLATES: Record<OrderStatus, string> = {
  PENDING: "order_status_changed",
  CONFIRMED: "order_confirmed",
  PACKED: "order_packed",
  OUT_FOR_DELIVERY: "order_out_for_delivery",
  READY_FOR_PICKUP: "order_ready_for_pickup",
  COMPLETED: "order_completed",
  CANCELLED: "order_cancelled",
  REFUNDED: "order_status_changed",
};

const STATUS_TIMESTAMPS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "confirmedAt",
  PACKED: "packedAt",
  OUT_FOR_DELIVERY: "outForDeliveryAt",
  READY_FOR_PICKUP: "readyForPickupAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
  REFUNDED: "cancelledAt",
};

const schema = z.object({
  status: z.enum(ORDER_STATUSES as unknown as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Transition an order's status. */
export const POST = route(async (request, ctx: Ctx) => {
  const staff = await requireStaffApi(request);
  const { id } = await ctx.params;
  const { status, note } = await parseBody(schema, request);
  const next = status as OrderStatus;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw NOT_FOUND("Order");

  const allowed = ORDER_STATUS_FLOW[order.status];
  if (status !== order.status && !allowed.includes(next)) {
    throw new ApiError(400, `Cannot move an order from ${order.status} to ${status}.`);
  }

  const terminal = next === "CANCELLED" || next === "REFUNDED";
  const wasTerminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = { status };
    const stampField = STATUS_TIMESTAMPS[next];
    if (stampField && !order[stampField as keyof typeof order]) data[stampField] = new Date();

    await tx.order.update({ where: { id }, data });
    await tx.orderStatusEvent.create({
      data: { orderId: id, status: next, note: note?.trim() || null, actorId: staff.id },
    });

    if (terminal && !wasTerminal) {
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.quantity } },
          });
        }
      }
    }
  });

  await queueNotification({
    userId: order.userId,
    template: STATUS_TEMPLATES[next],
    payload: { orderId: id, status, orderNumber: order.orderNumber, note: note?.trim() || undefined },
  });
  processNotificationQueueSoon();

  return NextResponse.json({ ok: true });
});
