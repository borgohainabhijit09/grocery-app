import { z } from "zod";

export const idSchema = z.string().min(1);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a valid 6-digit PIN code");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

/** Absolute http(s) URL or an app-relative path (e.g. /uploads/x.png). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => /^https?:\/\//.test(v) || v.startsWith("/"),
    "Enter a valid image URL"
  );

export type ApiError = {
  error: string;
  details?: Record<string, string[]>;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
