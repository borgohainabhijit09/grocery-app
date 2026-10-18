"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "database";
import { otpRequestSchema, otpVerifySchema, registerSchema, OTP_RESEND_COOLDOWN_SECONDS } from "shared";
import { signIn } from "@/auth";
import { createOtp, issueSilentOtp, verifyOtp, type RequestOtpResult } from "@/lib/otp";

export type OtpActionResult = {
  error?: string;
  step?: "otp";
  phone?: string;
  devCode?: string;
  emailMasked?: string | null;
  cooldownSeconds?: number;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

function fromRequest(result: RequestOtpResult, phone: string): OtpActionResult {
  if (!result.ok) return { error: result.error, cooldownSeconds: result.cooldownSeconds, step: "otp", phone };
  return {
    step: "otp",
    phone,
    devCode: result.devCode,
    emailMasked: result.emailMasked,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

/** Step 1 of signup: validate the form and email a verification code. */
export async function requestSignupOtpAction(
  _prev: OtpActionResult | undefined,
  formData: FormData
): Promise<OtpActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account with this email or phone already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await createOtp({
    phone,
    email,
    purpose: "SIGNUP",
    payload: { name, email, phone, passwordHash },
  });

  return fromRequest(result, phone);
}

/** Step 2 of signup: verify the code, create the account and log the user in. */
export async function verifySignupOtpAction(
  _prev: OtpActionResult | undefined,
  formData: FormData
): Promise<OtpActionResult> {
  const parsed = otpVerifySchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }

  const { phone, code } = parsed.data;
  const verified = await verifyOtp({ phone, code, purpose: "SIGNUP" });
  if (!verified.ok) return { error: verified.error };

  const payload = verified.payload as
    | { name: string; email: string; phone: string; passwordHash: string }
    | null;
  if (!payload?.passwordHash) {
    return { error: "Your details expired. Please start the signup again." };
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: payload.email }, { phone: payload.phone }] },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account with this email or phone already exists." };
  }

  await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.passwordHash,
      role: "CUSTOMER",
      phoneVerifiedAt: new Date(),
    },
  });

  try {
    const loginCode = await issueSilentOtp(phone, "LOGIN");
    await signIn("otp", { phone, code: loginCode, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: true, error: "Account created. Please log in." };
    }
    throw error;
  }
}

/** Step 1 of passwordless login: email a code to the account's email address. */
export async function requestLoginOtpAction(
  _prev: OtpActionResult | undefined,
  formData: FormData
): Promise<OtpActionResult> {
  const parsed = otpRequestSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid mobile number." };
  }

  const { phone } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { email: true, isActive: true },
  });

  // Always advance to the code step so we don't reveal whether a phone exists.
  if (!user || !user.isActive) {
    return { step: "otp", phone, emailMasked: null, cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }

  const result = await createOtp({ phone, email: user.email, purpose: "LOGIN" });
  return fromRequest(result, phone);
}

/** Step 2 of passwordless login: verify the code and start a session. */
export async function verifyLoginOtpAction(
  _prev: OtpActionResult | undefined,
  formData: FormData
): Promise<OtpActionResult> {
  const parsed = otpVerifySchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }

  try {
    await signIn("otp", { phone: parsed.data.phone, code: parsed.data.code, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid or expired code. Please try again." };
    }
    throw error;
  }
}

/** Resend a code for an in-progress flow, reusing the stored phone/email. */
export async function resendOtpAction(
  _prev: OtpActionResult | undefined,
  formData: FormData
): Promise<OtpActionResult> {
  const purpose = formData.get("purpose") === "SIGNUP" ? "SIGNUP" : "LOGIN";
  const parsed = otpRequestSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) return { error: "Enter a valid mobile number." };

  const { phone } = parsed.data;
  const latest = await prisma.otpCode.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: "desc" },
    select: { email: true, payload: true },
  });
  if (!latest) return { error: "Request a new code.", step: "otp", phone };

  const result = await createOtp({
    phone,
    email: latest.email,
    purpose,
    payload: (latest.payload as Record<string, unknown> | null) ?? undefined,
  });
  return fromRequest(result, phone);
}
