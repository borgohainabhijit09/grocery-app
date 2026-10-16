import { z } from "zod";
import { FULFILLMENT_TYPES, ORDER_STATUSES, PAYMENT_METHODS } from "../constants";

export const placeOrderSchema = z
  .object({
    fulfillmentType: z.enum(FULFILLMENT_TYPES),
    addressId: z.string().min(1).optional(),
    slotId: z.string().min(1).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    couponCode: z.string().trim().max(40).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((v) => v.fulfillmentType !== "DELIVERY" || !!v.addressId, {
    message: "Delivery address is required",
    path: ["addressId"],
  })
  .refine((v) => !!v.slotId, {
    message: "Please choose a time slot",
    path: ["slotId"],
  });
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const slotInputSchema = z.object({
  date: z.coerce.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  capacity: z.coerce.number().int().min(1).max(999).default(20),
  fulfillmentType: z.enum(FULFILLMENT_TYPES),
  isActive: z.boolean().default(true),
});
export type SlotInput = z.infer<typeof slotInputSchema>;
