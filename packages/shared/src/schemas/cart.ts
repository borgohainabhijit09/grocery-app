import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
