import { NextResponse } from "next/server";
import { prisma } from "database";
import { otpVerifySchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { signApiToken } from "@/lib/api-auth";
import { serializeUser } from "@/lib/api-serialize";
import { verifyOtp } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verify a LOGIN OTP and return a bearer token. */
export const POST = route(async (request) => {
  const { phone, code } = await parseBody(otpVerifySchema, request);

  const result = await verifyOtp({ phone, code, purpose: "LOGIN" });
  if (!result.ok) throw new ApiError(401, result.error);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.isActive) throw new ApiError(401, "Account not available.");

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
  });

  const token = await signApiToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ token, user: serializeUser(user) });
});
