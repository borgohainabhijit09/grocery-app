import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "database";
import { registerSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { signApiToken } from "@/lib/api-auth";
import { serializeUser } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const { name, email, phone, password } = await parseBody(registerSchema, request);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, "An account with this email or phone already exists.");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      role: "CUSTOMER",
      phoneVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  const token = await signApiToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ token, user: serializeUser(user) }, { status: 201 });
});
