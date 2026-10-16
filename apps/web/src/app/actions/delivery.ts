"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { ORDER_STATUS_FLOW, type OrderStatus } from "shared";
import { auth } from "@/auth";
import { queueNotification } from "@/lib/notifications";
import { toDbError, type FormState } from "@/lib/action-result";

/** Transitions a delivery partner is allowed to make from the portal. */
const DELIVERY_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PACKED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
};

async function requireDeliveryUser(): Promise<{ id: string; role: string }> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !["DELIVERY", "ADMIN", "STAFF"].includes(user.role ?? "")) {
    throw new Error("Unauthorized");
  }
  return { id: user.id, role: user.role ?? "" };
}

/**
 * Move an assigned order forward from the delivery partner portal. Partners may
 * only mark their own orders out for delivery or delivered; COD orders are
 * settled as paid on delivery.
 */
export async function updateDeliveryStatusAction(
  orderId: string,
  status: string
): Promise<FormState> {
  const me = await requireDeliveryUser();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (me.role === "DELIVERY" && order.deliveryPartnerId !== me.id) {
    return { error: "This order is not assigned to you." };
  }

  const next = status as OrderStatus;
  const fromDelivery = DELIVERY_TRANSITIONS[order.status] ?? [];
  const allowedByFlow = ORDER_STATUS_FLOW[order.status] ?? [];
  if (!fromDelivery.includes(next) || !allowedByFlow.includes(next)) {
    return { error: `Cannot move an order from ${order.status} to ${status}.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { status: next };
      if (next === "OUT_FOR_DELIVERY") data.outForDeliveryAt = new Date();
      if (next === "COMPLETED") {
        data.completedAt = new Date();
        if (order.paymentMethod === "COD" && order.paymentStatus !== "PAID") {
          data.paymentStatus = "PAID";
          await tx.payment.create({
            data: {
              orderId,
              provider: "cod",
              method: "COD",
              status: "PAID",
              amountPaise: order.totalPaise,
            },
          });
        }
      }

      await tx.order.update({ where: { id: orderId }, data });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status: next,
          note: next === "COMPLETED" ? "Delivered to customer" : "Left for delivery",
          actorId: me.id,
        },
      });
    });

    await queueNotification({
      userId: order.userId,
      template: next === "COMPLETED" ? "order_completed" : "order_out_for_delivery",
      payload: { orderId, orderNumber: order.orderNumber, status: next },
    });

    revalidatePath("/delivery");
    revalidatePath(`/delivery/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}
