import { NextResponse } from "next/server";
import { prisma } from "database";
import { couponInputSchema } from "shared";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminCoupon } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw NOT_FOUND("Coupon");

  return NextResponse.json({ coupon: serializeAdminCoupon(coupon) });
});

export const PATCH = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;
  const data = await parseBody(couponInputSchema, request);

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw NOT_FOUND("Coupon");

  const code = data.code.toUpperCase();
  const conflict = await prisma.coupon.findFirst({ where: { code, NOT: { id } } });
  if (conflict) throw new ApiError(409, "Code already in use.", { code: ["Already in use"] });

  await prisma.coupon.update({
    where: { id },
    data: {
      code,
      description: data.description || null,
      type: data.type,
      value: data.value,
      minOrderPaise: data.minOrderPaise,
      maxDiscountPaise: data.maxDiscountPaise ?? null,
      maxUses: data.maxUses ?? null,
      startsAt: data.startsAt ?? existing.startsAt,
      expiresAt: data.expiresAt ?? null,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ ok: true, id });
});

export const DELETE = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw NOT_FOUND("Coupon");

  await prisma.coupon.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
