"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import type { OrderStatus } from "shared";
import { ORDER_STATUS_FLOW } from "shared";
import { requireStaff } from "@/lib/auth-guard";
import { toDbError, type FormState } from "./_shared";
import { queueNotification, processNotificationQueueSoon } from "@/lib/notifications";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tx = any;

/** Customer-facing template for each order status transition. */
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

/** Restore stock for a cancelled/refunded order (call only on first transition). */
async function restoreStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQty: { increment: item.quantity } },
      });
    }
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: string,
  note?: string
): Promise<FormState> {
  const staff = await requireStaff();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };

  const next = status as OrderStatus;
  const allowed = ORDER_STATUS_FLOW[order.status];
  if (status !== order.status && !allowed.includes(next)) {
    return { error: `Cannot move an order from ${order.status} to ${status}.` };
  }

  const terminal = status === "CANCELLED" || status === "REFUNDED";
  const wasTerminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  try {
    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { status };

      const stampField = STATUS_TIMESTAMPS[next];
      if (stampField && !order[stampField as keyof typeof order]) {
        data[stampField] = new Date();
      }

      await tx.order.update({ where: { id: orderId }, data });

      await tx.orderStatusEvent.create({
        data: { orderId, status: next, note: note?.trim() || null, actorId: staff.id },
      });

      if (terminal && !wasTerminal) await restoreStock(tx, orderId);
    });

    await queueNotification({
      userId: order.userId,
      template: STATUS_TEMPLATES[next],
      payload: {
        orderId,
        status,
        orderNumber: order.orderNumber,
        note: note?.trim() || undefined,
      },
    });
    processNotificationQueueSoon();

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

export async function bulkUpdateOrderStatusAction(
  orderIds: string[],
  status: string
): Promise<FormState> {
  await requireStaff();
  if (orderIds.length === 0) return { error: "No orders selected." };

  let updated = 0;
  let lastError: string | undefined;
  for (const id of orderIds) {
    const res = await updateOrderStatusAction(id, status);
    if (res.ok) updated += 1;
    else lastError = res.error;
  }

  if (updated === 0) {
    return { error: lastError ?? `No orders could be moved to ${status}.` };
  }
  return { ok: true };
}

export async function markOrderPaidAction(orderId: string): Promise<FormState> {
  await requireStaff();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PAID" } });
      await tx.payment.updateMany({
        where: { orderId },
        data: { status: "PAID" },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}
