import { z } from "zod";
import { phoneSchema, pincodeSchema } from "./common";

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal("")),
  fullName: z.string().trim().min(2, "Name is too short").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Address is too short").max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: pincodeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
