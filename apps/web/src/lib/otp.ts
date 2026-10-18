import { randomInt, createHash } from "node:crypto";
import { prisma, type Prisma } from "database";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_REQUESTS_PER_HOUR,
  type OtpPurpose,
} from "shared";

/**
 * Phone OTP delivery.
 *
 * The default provider is a no-op "mock" that logs the code to the server
 * console and (outside production) returns it so the UI can display a dev hint.
 * Setting OTP_PROVIDER=resend + RESEND_API_KEY/MAIL_FROM switches to real
 * delivery by email — no code changes required. This mirrors the email
 * notification fallback used elsewhere.
 */

export type RequestOtpInput = {
  phone: string;
  email?: string | null;
  purpose: OtpPurpose;
  payload?: Record<string, unknown>;
};

export type RequestOtpResult =
  | { ok: true; devCode?: string; emailMasked?: string | null }
  | { ok: false; error: string; cooldownSeconds?: number };

export type VerifyOtpResult =
  | { ok: true; payload: unknown }
  | { ok: false; error: string };

function otpSecret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-otp-secret";
}

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}:${otpSecret()}`).digest("hex");
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 1);
  return `${head}${"*".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

async function deliverOtp(input: {
  phone: string;
  email?: string | null;
  code: string;
}): Promise<{ skipped: boolean; error?: string }> {
  const provider = (process.env.OTP_PROVIDER ?? "mock").toLowerCase();

  if (provider === "resend" && input.email && isEmailConfigured()) {
    const res = await sendEmail({
      to: input.email,
      subject: "Your Fresh Basket verification code",
      html: `<p>Your verification code is <strong>${input.code}</strong>.</p>
             <p>It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.</p>`,
      text: `Your Fresh Basket verification code is ${input.code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    });
    return { skipped: false, error: res.ok ? undefined : res.error };
  }

  console.log(`[otp:mock] phone=${input.phone} code=${input.code}`);
  return { skipped: true };
}

/** Create and deliver an OTP, enforcing a resend cooldown and hourly cap. */
export async function createOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
  const now = new Date();

  const latest = await prisma.otpCode.findFirst({
    where: { phone: input.phone, purpose: input.purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (latest) {
    const elapsed = (now.getTime() - latest.createdAt.getTime()) / 1000;
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed);
      return { ok: false, error: `Please wait ${wait}s before requesting another code.`, cooldownSeconds: wait };
    }
  }

  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentCount = await prisma.otpCode.count({
    where: { phone: input.phone, purpose: input.purpose, createdAt: { gte: hourAgo } },
  });
  if (recentCount >= OTP_MAX_REQUESTS_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Try again later." };
  }

  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      phone: input.phone,
      email: input.email ?? null,
      purpose: input.purpose,
      codeHash: hashCode(input.phone, code),
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
    },
  });

  const delivery = await deliverOtp({ phone: input.phone, email: input.email, code });

  const devCode =
    delivery.skipped && process.env.NODE_ENV !== "production" ? code : undefined;

  return { ok: true, devCode, emailMasked: maskEmail(input.email) };
}

/** Verify the most recent unconsumed OTP for a phone + purpose. */
export async function verifyOtp(input: {
  phone: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<VerifyOtpResult> {
  const rec = await prisma.otpCode.findFirst({
    where: { phone: input.phone, purpose: input.purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!rec) return { ok: false, error: "Request a new code." };

  if (rec.expiresAt < new Date()) {
    return { ok: false, error: "This code has expired. Request a new one." };
  }

  if (rec.attempts >= rec.maxAttempts) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  if (rec.codeHash !== hashCode(input.phone, input.code)) {
    const attempts = rec.attempts + 1;
    await prisma.otpCode.update({ where: { id: rec.id }, data: { attempts } });
    return {
      ok: false,
      error:
        attempts >= rec.maxAttempts
          ? "Too many attempts. Request a new code."
          : "Incorrect code. Please try again.",
    };
  }

  await prisma.otpCode.update({
    where: { id: rec.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, payload: rec.payload ?? null };
}

/** Invalidate any outstanding codes for a phone + purpose (e.g. after success). */
export async function consumeAllOtps(phone: string, purpose: OtpPurpose): Promise<void> {
  await prisma.otpCode.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

/**
 * Store an OTP without delivering it, returning the plaintext code. Used
 * server-side to establish a session (e.g. right after signup completes) via
 * the "otp" credentials provider.
 */
export async function issueSilentOtp(phone: string, purpose: OtpPurpose): Promise<string> {
  const code = generateOtp();
  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: hashCode(phone, code),
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  return code;
}
