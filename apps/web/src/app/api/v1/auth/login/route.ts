import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "database";
import { loginSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { signApiToken } from "@/lib/api-auth";
import { serializeUser } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const { email, password } = await parseBody(loginSchema, request);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password.");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password.");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = await signApiToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ token, user: serializeUser(user) });
});
