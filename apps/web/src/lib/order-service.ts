import { prisma } from "database";
import type { Address, Coupon } from "database";
import {
  calculatePricing,
  generateOrderNumber,
  isWithinRadius,
  ORDER_STATUS_FLOW,
  type PlaceOrderInput,
} from "shared";
import { evaluateCoupon } from "./coupon";
import { createRazorpayOrder, isRazorpayConfigured } from "./razorpay";
import { queueNotification, processNotificationQueueSoon } from "./notifications";

export type PlaceOrderResult =
  | {
      ok: true;
      order: { id: string; orderNumber: string; totalPaise: number };
      razorpay?: { orderId: string; rzpOrderId: string; keyId: string; amountPaise: number };
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Place an order from the user's active cart. Returns JSON-safe data (no redirects). */
export async function createOrder(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const [cart, settings, slot] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.slot.findUnique({ where: { id: input.slotId } }),
  ]);

  if (!cart || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };
  if (settings && !settings.acceptingOrders) {
    return { ok: false, error: "We are not accepting new orders right now." };
  }
  if (!slot || !slot.isActive) return { ok: false, error: "Selected slot is unavailable." };
  if (slot.fulfillmentType !== input.fulfillmentType) {
    return { ok: false, error: "Slot does not match the selected fulfillment type." };
  }

  const slotBooked = await prisma.order.count({
    where: { slotId: slot.id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });
  if (slotBooked >= slot.capacity) {
    return { ok: false, error: "This time slot is full. Please choose another slot." };
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
    if (!input.addressId) return { ok: false, error: "Delivery address is required." };
    address = await prisma.address.findUnique({ where: { id: input.addressId, userId } });
    if (!address) return { ok: false, error: "Delivery address not found." };

    if (deliverySettings.latitude !== 0 || deliverySettings.longitude !== 0) {
      const center = { latitude: deliverySettings.latitude, longitude: deliverySettings.longitude };
      const point = { latitude: address.latitude, longitude: address.longitude };
      if (!isWithinRadius(center, point, deliverySettings.deliveryRadiusKm)) {
        return { ok: false, error: "Your address is outside our delivery area." };
      }
    }
  }

  let subtotal = 0;
  for (const item of cart.items) {
    if (!item.variant || !item.variant.isActive) {
      return { ok: false, error: `Some items are unavailable: ${item.variant?.label ?? "item"}.` };
    }
    if (item.quantity > item.variant.stockQty) {
      return { ok: false, error: `Insufficient stock for ${item.variant.label}.` };
    }
    subtotal += item.variant.pricePaise * item.quantity;
  }

  if (subtotal < deliverySettings.minOrderValuePaise) {
    return { ok: false, error: "Minimum order amount not met." };
  }

  let coupon: Coupon | null = null;
  let discount = 0;
  const code = input.couponCode?.trim();
  if (code) {
    coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const ev = evaluateCoupon(coupon, subtotal);
    if (!ev.valid) return { ok: false, error: ev.reason };
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
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponRedemption.create({
          data: { couponId: coupon.id, userId, orderId: created.id, discountPaise: pricing.discountPaise },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.orderStatusEvent.create({
        data: { orderId: created.id, status: "PENDING", note: "Order placed" },
      });

      return created;
    });
  } catch {
    return { ok: false, error: "Could not place your order. Please try again." };
  }

  await queueNotification({
    userId,
    template: "order_placed",
    payload: { orderId: order.id, orderNumber: order.orderNumber },
  });
  processNotificationQueueSoon();

  if (input.paymentMethod === "RAZORPAY" && isRazorpayConfigured()) {
    try {
      const rzp = await createRazorpayOrder({
        amountPaise: order.totalPaise,
        receipt: order.orderNumber,
        notes: { orderId: order.id, orderNumber: order.orderNumber },
      });

      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
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

      return {
        ok: true,
        order,
        razorpay: {
          orderId: order.id,
          rzpOrderId: rzp.id,
          keyId: process.env.RAZORPAY_KEY_ID ?? "",
          amountPaise: order.totalPaise,
        },
      };
    } catch {
      return { ok: false, error: "Could not start the payment. Please try again." };
    }
  }

  return { ok: true, order };
}

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

/** Cancel a customer's order (restores stock, records the event). */
export async function cancelOrder(
  userId: string,
  orderId: string,
  reason?: string
): Promise<CancelOrderResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.userId !== userId) return { ok: false, error: "Order not found." };

  const allowed = ORDER_STATUS_FLOW[order.status as keyof typeof ORDER_STATUS_FLOW] ?? [];
  if (!allowed.includes("CANCELLED")) return { ok: false, error: "This order cannot be cancelled." };

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
          note: reason?.trim() || "Cancelled by customer",
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

      if (order.paymentMethod === "COD" && order.paymentStatus === "PAID") {
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
      }
    });

    await queueNotification({
      userId,
      template: "order_cancelled",
      payload: { orderId, orderNumber: order.orderNumber, note: reason?.trim() || "Cancelled by customer" },
    });
    processNotificationQueueSoon();

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not cancel the order." };
  }
}
