import { NextResponse } from "next/server";
import { prisma } from "database";
import { ApiError, route } from "@/lib/api-helpers";
import { requireAdminApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Activate / deactivate a delivery partner (admin only). */
export const POST = route(async (request, ctx: Ctx) => {
  await requireAdminApi(request);
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "DELIVERY") throw new ApiError(404, "Delivery partner not found.");

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  return NextResponse.json({ id: updated.id, isActive: updated.isActive });
});
