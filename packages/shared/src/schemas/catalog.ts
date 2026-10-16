import { z } from "zod";
import { imageUrlSchema, slugSchema } from "./common";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
  image: imageUrlSchema.optional().or(z.literal("")),
  parentId: z.string().min(1).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const variantInputSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().trim().min(1, "Variant label is required").max(40),
  pricePaise: z.coerce.number().int().min(0),
  mrpPaise: z.coerce.number().int().min(0).optional().nullable(),
  stockQty: z.coerce.number().int().min(0).default(0),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: slugSchema.optional(),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Category is required"),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  unit: z.string().trim().max(40).optional().or(z.literal("")),
  images: z.array(imageUrlSchema).max(8).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  variants: z.array(variantInputSchema).min(1, "At least one variant is required"),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;
