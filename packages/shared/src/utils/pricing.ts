import { formatINR } from "./currency";

export type CartPricingInput = {
  subtotalPaise: number;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise?: number | null;
  discountPaise?: number;
  taxRatePercent?: number;
  fulfillmentType: "DELIVERY" | "PICKUP";
};

export type CartPricing = {
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  freeDeliveryApplied: boolean;
};

/** Central pricing calculation shared by cart preview, checkout and order creation. */
export function calculatePricing(input: CartPricingInput): CartPricing {
  const subtotal = Math.max(0, Math.round(input.subtotalPaise));
  const discount = Math.min(subtotal, Math.max(0, Math.round(input.discountPaise ?? 0)));

  let deliveryFee = 0;
  if (input.fulfillmentType === "DELIVERY") {
    deliveryFee = Math.max(0, Math.round(input.deliveryFeePaise));
    const threshold = input.freeDeliveryAbovePaise;
    if (threshold != null && threshold > 0 && subtotal >= threshold) {
      deliveryFee = 0;
    }
  }

  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * (input.taxRatePercent ?? 0)) / 100);

  return {
    subtotalPaise: subtotal,
    deliveryFeePaise: deliveryFee,
    discountPaise: discount,
    taxPaise: tax,
    totalPaise: taxable + deliveryFee + tax,
    freeDeliveryApplied: deliveryFee === 0 && input.fulfillmentType === "DELIVERY",
  };
}

export { formatINR };
