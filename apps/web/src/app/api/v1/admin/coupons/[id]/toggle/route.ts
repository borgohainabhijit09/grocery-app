import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Flip a coupon's active flag. */
export const POST = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw NOT_FOUND("Coupon");

  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return NextResponse.json({ id, isActive: updated.isActive });
});
