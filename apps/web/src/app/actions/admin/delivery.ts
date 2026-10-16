"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { requireAdmin, requireStaff } from "@/lib/auth-guard";
import { queueNotification } from "@/lib/notifications";
import { toDbError, type FormState } from "./_shared";

/**
 * Create a delivery partner account (role DELIVERY). Only admins can manage
 * the people who carry out deliveries.
 */
export async function createDeliveryPartnerAction(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Name is required.", fieldErrors: { name: ["Name is required."] } };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email.", fieldErrors: { email: ["Enter a valid email."] } };
  }
  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      fieldErrors: { password: ["Password must be at least 8 characters."] },
    };
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });
    if (existing) {
      return { error: "A user with this email or phone already exists." };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: await bcrypt.hash(password, 10),
        role: "DELIVERY",
      },
    });

    revalidatePath("/admin/delivery");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

export async function toggleDeliveryPartnerAction(userId: string): Promise<FormState> {
  await requireAdmin();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "DELIVERY") return { error: "Delivery partner not found." };

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/admin/delivery");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

/** Assign (or unassign when partnerId is null) a delivery partner on an order. */
export async function assignDeliveryPartnerAction(
  orderId: string,
  partnerId: string | null
): Promise<FormState> {
  const staff = await requireStaff();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.fulfillmentType !== "DELIVERY") {
    return { error: "Only delivery orders can be assigned to a delivery partner." };
  }

  let partnerName: string | undefined;
  if (partnerId) {
    const partner = await prisma.user.findUnique({ where: { id: partnerId } });
    if (!partner || partner.role !== "DELIVERY" || !partner.isActive) {
      return { error: "Delivery partner not found." };
    }
    partnerName = partner.name;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryPartnerId: partnerId ?? null,
          assignedAt: partnerId ? new Date() : null,
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
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
        payload: {
          orderId,
          orderNumber: order.orderNumber,
          recipientName: partnerName,
        },
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/delivery");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}
