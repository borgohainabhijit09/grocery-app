"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "database";
import type { Address, Coupon } from "database";
import { placeOrderSchema, type CancelOrderInput, type PlaceOrderInput } from "shared";
import { calculatePricing } from "shared";
import { isWithinRadius } from "shared";
import { generateOrderNumber } from "shared";
import { ORDER_STATUS_FLOW } from "shared";
import { auth } from "@/auth";
import { fieldErrorsFrom, toDbError, type FormState } from "@/lib/action-result";
import { evaluateCoupon } from "@/lib/coupon";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpaySignature } from "@/lib/razorpay";
import { queueNotification } from "@/lib/notifications";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function validateCouponAction(
  code: string,
  subtotalPaise: number
): Promise<{ ok: boolean; discountPaise?: number; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code: trimmed.toUpperCase() } });
  const ev = evaluateCoupon(coupon, subtotalPaise);
  if (!ev.valid) return { ok: false, error: ev.reason };

  return { ok: true, discountPaise: ev.discountPaise };
}

/** Place an order from the user's active cart. */
export async function placeOrderAction(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const userId = await requireUserId();

  const parsed = placeOrderSchema.safeParse({
    fulfillmentType: formData.get("fulfillmentType"),
    addressId: (formData.get("addressId") as string | null) ?? undefined,
    slotId: formData.get("slotId") as string,
    paymentMethod: formData.get("paymentMethod"),
    couponCode: (formData.get("couponCode") as string | null) ?? undefined,
    notes: (formData.get("notes") as string | null) ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const input = parsed.data as PlaceOrderInput;

  const [cart, settings, slot] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.slot.findUnique({ where: { id: input.slotId } }),
  ]);

  if (!cart || cart.items.length === 0) {
    return { error: "Your cart is empty." };
  }
  if (settings && !settings.acceptingOrders) {
    return { error: "We are not accepting new orders right now." };
  }
  if (!slot || !slot.isActive) {
    return { error: "Selected slot is unavailable." };
  }
  if (slot.fulfillmentType !== input.fulfillmentType) {
    return { error: "Slot does not match the selected fulfillment type." };
  }

  const slotBooked = await prisma.order.count({
    where: { slotId: slot.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });
  if (slotBooked >= slot.capacity) {
    return { error: "This time slot is full. Please choose another slot." };
  }

  const deliverySettings = settings ?? {
    deliveryFeePaise: 3000,
    freeDeliveryAbovePaise: 50000,
    minOrderValuePaise: 10000,
    taxRatePercent: 0,
    deliveryRadiusKm: 10,
    latitude: 0,
    longitude: 0,
  };

  let address: Address | null = null;
  if (input.fulfillmentType === "DELIVERY") {
    if (!input.addressId) return { error: "Delivery address is required." };
    address = await prisma.address.findUnique({ where: { id: input.addressId, userId } });
    if (!address) return { error: "Delivery address not found." };

    if (deliverySettings.latitude !== 0 || deliverySettings.longitude !== 0) {
      const center = { latitude: deliverySettings.latitude, longitude: deliverySettings.longitude };
      const point = { latitude: address.latitude, longitude: address.longitude };
      if (!isWithinRadius(center, point, deliverySettings.deliveryRadiusKm)) {
        return { error: "Your address is outside our delivery area." };
      }
    }
  }

  let subtotal = 0;
  for (const item of cart.items) {
    if (!item.variant || !item.variant.isActive) {
      return { error: `Some items are unavailable: ${item.variant?.label ?? "item"}.` };
    }
    if (item.quantity > item.variant.stockQty) {
      return { error: `Insufficient stock for ${item.variant.label}.` };
    }
    subtotal += item.variant.pricePaise * item.quantity;
  }

  if (subtotal < deliverySettings.minOrderValuePaise) {
    return { error: "Minimum order amount not met." };
  }

  let coupon: Coupon | null = null;
  let discount = 0;
  const code = input.couponCode?.trim();
  if (code) {
    coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const ev = evaluateCoupon(coupon, subtotal);
    if (!ev.valid) return { error: ev.reason };
    discount = ev.discountPaise;
    coupon = ev.coupon;
  }

  const pricing = calculatePricing({
    subtotalPaise: subtotal,
    deliveryFeePaise: deliverySettings.deliveryFeePaise,
    freeDeliveryAbovePaise: deliverySettings.freeDeliveryAbovePaise,
    discountPaise: discount,
    taxRatePercent: deliverySettings.taxRatePercent ?? 0,
    fulfillmentType: input.fulfillmentType,
  });

  const orderNumber = generateOrderNumber();

  let order: { id: string; orderNumber: string; totalPaise: number };
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          fulfillmentType: input.fulfillmentType,
          paymentMethod: input.paymentMethod,
          paymentStatus: "UNPAID",
          addressId: input.fulfillmentType === "DELIVERY" ? (address?.id ?? null) : null,
          slotId: slot.id,
          addressSnapshot:
            input.fulfillmentType === "DELIVERY" && address
              ? {
                  id: address.id,
                  label: address.label,
                  fullName: address.fullName,
                  phone: address.phone,
                  line1: address.line1,
                  line2: address.line2,
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                  latitude: address.latitude,
                  longitude: address.longitude,
                }
              : undefined,
          subtotalPaise: pricing.subtotalPaise,
          deliveryFeePaise: pricing.deliveryFeePaise,
          discountPaise: pricing.discountPaise,
          taxPaise: pricing.taxPaise,
          totalPaise: pricing.totalPaise,
          couponId: coupon?.id ?? null,
          notes: input.notes?.trim() || null,
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            variantId: item.variantId,
            productName: item.variant.product.name,
            variantLabel: item.variant.label,
            unit: item.variant.product.unit ?? null,
            image: item.variant.product.images[0] ?? null,
            pricePaise: item.variant.pricePaise,
            mrpPaise: item.variant.mrpPaise,
            quantity: item.quantity,
            lineTotalPaise: item.variant.pricePaise * item.quantity,
          },
        });

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }

      if (coupon?.id) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId,
            orderId: created.id,
            discountPaise: pricing.discountPaise,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await tx.orderStatusEvent.create({
        data: { orderId: created.id, status: "PENDING", note: "Order placed" },
      });

      return created;
    });
  } catch (err) {
    return toDbError(err);
  }

  await queueNotification({
    userId,
    template: "order_placed",
    payload: { orderId: order.id, orderNumber: order.orderNumber },
  });

  revalidatePath("/cart");
  revalidatePath("/account/orders");
  revalidatePath("/admin/orders");

  if (input.paymentMethod === "RAZORPAY" && isRazorpayConfigured()) {
    let rzpId: string;
    try {
      const rzp = await createRazorpayOrder({
        amountPaise: order.totalPaise,
        receipt: order.orderNumber,
        notes: { orderId: order.id, orderNumber: order.orderNumber },
      });
      rzpId = rzp.id;

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PENDING" },
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          method: "RAZORPAY",
          status: "PENDING",
          amountPaise: order.totalPaise,
          providerOrderId: rzp.id,
        },
      });
    } catch (err) {
      return toDbError(err);
    }

    redirect(`/checkout/razorpay?orderId=${order.id}&rzpOrderId=${rzpId}`);
  }

  redirect(`/checkout/success?orderId=${order.id}`);
}

export async function cancelOrderAction(
  orderId: string,
  input: CancelOrderInput
): Promise<FormState> {
  const userId = await requireUserId();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== userId) return { error: "Order not found." };

  const allowed = ORDER_STATUS_FLOW[order.status] ?? [];
  if (!allowed.includes("CANCELLED")) {
    return { error: "This order cannot be cancelled." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      await tx.orderStatusEvent.create({
        data: {
          orderId,
          status: "CANCELLED",
          note: input.reason?.trim() || "Cancelled by customer",
          actorId: userId,
        },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQty: { increment: item.quantity } },
          });
        }
      }

      if (order.paymentMethod === "COD") {
        if (order.paymentStatus === "PAID") {
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
        }
      }
    });

    revalidatePath("/account/orders");
    revalidatePath("/account/orders/[id]", "page");
    revalidatePath("/admin/orders");

    await queueNotification({
      userId,
      template: "order_cancelled",
      payload: {
        orderId,
        orderNumber: order.orderNumber,
        note: input.reason?.trim() || "Cancelled by customer",
      },
    });

    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

export async function razorpayVerifyAction(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const userId = await requireUserId();
  const orderId = (formData.get("orderId") as string | null) ?? "";
  if (!orderId) return { error: "Missing order reference." };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId) return { error: "Order not found." };

  const rzpOrderId = (formData.get("razorpay_order_id") as string | null) ?? "";
  const rzpPaymentId = (formData.get("razorpay_payment_id") as string | null) ?? "";
  const rzpSignature = (formData.get("razorpay_signature") as string | null) ?? "";

  if (!rzpOrderId || !rzpPaymentId || !rzpSignature) {
    return { error: "Payment verification failed." };
  }

  const ok = verifyRazorpaySignature({ orderId: rzpOrderId, paymentId: rzpPaymentId, signature: rzpSignature });
  if (!ok) return { error: "Invalid payment signature." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId, providerOrderId: rzpOrderId },
        data: {
          status: "PAID",
          providerPaymentId: rzpPaymentId,
          signature: rzpSignature,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: "PAID" },
      });
    });

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}
