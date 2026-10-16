import { z } from "zod";
import { phoneSchema } from "./common";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phoneSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
