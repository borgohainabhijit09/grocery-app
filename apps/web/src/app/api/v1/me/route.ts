import { NextResponse } from "next/server";
import { prisma } from "database";
import { updateProfileSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeUser } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const me = await requireApiUser(request);
  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) throw new ApiError(401, "Account not available.");

  const [orderCount, addressCount] = await Promise.all([
    prisma.order.count({ where: { userId: me.id } }),
    prisma.address.count({ where: { userId: me.id } }),
  ]);

  return NextResponse.json({
    user: serializeUser(user),
    stats: { orders: orderCount, addresses: addressCount },
  });
});

export const PATCH = route(async (request) => {
  const me = await requireApiUser(request);
  const input = await parseBody(updateProfileSchema, request);

  if (input.phone) {
    const clash = await prisma.user.findFirst({
      where: { phone: input.phone, NOT: { id: me.id } },
      select: { id: true },
    });
    if (clash) throw new ApiError(409, "That phone number is already in use.");
  }

  const user = await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    },
  });

  return NextResponse.json({ user: serializeUser(user) });
});
