import type { Coupon } from "database";
import { formatINR } from "shared";

export type CouponEvaluation =
  | { valid: true; discountPaise: number; coupon: Coupon }
  | { valid: false; reason: string };

/** Validate a coupon against a subtotal and compute the discount, in paise. */
export function evaluateCoupon(
  coupon: Coupon | null,
  subtotalPaise: number,
  now = new Date()
): CouponEvaluation {
  if (!coupon) return { valid: false, reason: "Coupon not found." };
  if (!coupon.isActive) return { valid: false, reason: "This coupon is no longer active." };
  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, reason: "This coupon is not active yet." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, reason: "This coupon has expired." };
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    return {
      valid: false,
      reason: `Add ${formatINR(coupon.minOrderPaise - subtotalPaise)} more to use this coupon.`,
    };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: "This coupon has reached its usage limit." };
  }

  let discount =
    coupon.type === "PERCENT"
      ? Math.floor((subtotalPaise * coupon.value) / 100)
      : coupon.value;

  if (coupon.maxDiscountPaise != null) discount = Math.min(discount, coupon.maxDiscountPaise);
  discount = Math.min(discount, subtotalPaise);

  if (discount <= 0) {
    return { valid: false, reason: "This coupon gives no discount on your order." };
  }

  return { valid: true, discountPaise: discount, coupon };
}
