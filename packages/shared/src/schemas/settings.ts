import { z } from "zod";
import { imageUrlSchema, phoneSchema, pincodeSchema } from "./common";

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  logoUrl: imageUrlSchema.optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: phoneSchema.optional().or(z.literal("")),
  addressLine: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  pincode: pincodeSchema.optional().or(z.literal("")),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryRadiusKm: z.coerce.number().min(0).max(200),

  deliveryFeePaise: z.coerce.number().int().min(0),
  freeDeliveryAbovePaise: z.coerce.number().int().min(0).nullable().optional(),
  minOrderValuePaise: z.coerce.number().int().min(0),

  gstEnabled: z.boolean().default(false),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),

  acceptingOrders: z.boolean().default(true),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const couponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, - and _ only"),
  description: z.string().trim().max(160).optional().or(z.literal("")),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().int().min(1),
  minOrderPaise: z.coerce.number().int().min(0).default(0),
  maxDiscountPaise: z.coerce.number().int().min(0).nullable().optional(),
  maxUses: z.coerce.number().int().min(0).nullable().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type CouponInput = z.infer<typeof couponInputSchema>;
