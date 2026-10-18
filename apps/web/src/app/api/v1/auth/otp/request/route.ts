import { NextResponse } from "next/server";
import { prisma } from "database";
import { otpRequestSchema } from "shared";
import { parseBody, route } from "@/lib/api-helpers";
import { createOtp } from "@/lib/otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Request a LOGIN OTP for a phone number. */
export const POST = route(async (request) => {
  const body = await parseBody(otpRequestSchema, request);

  const user = await prisma.user.findUnique({
    where: { phone: body.phone },
    select: { email: true, isActive: true },
  });

  if (!user || !user.isActive) {
    // Do not reveal whether the account exists.
    return NextResponse.json({ ok: true, devCode: null, emailMasked: null, cooldownSeconds: 30 });
  }

  const result = await createOtp({ phone: body.phone, email: user.email, purpose: "LOGIN" });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, cooldownSeconds: result.cooldownSeconds },
      { status: 429 }
    );
  }

  return NextResponse.json({
    ok: true,
    devCode: result.devCode ?? null,
    emailMasked: result.emailMasked ?? null,
    cooldownSeconds: 30,
  });
});
