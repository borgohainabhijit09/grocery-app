import { NextResponse } from "next/server";
import { prisma } from "database";
import { couponInputSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminCoupon } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All coupons (optionally filtered by code/status) for the admin console. */
export const GET = route(async (request) => {
  await requireStaffApi(request);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim().toUpperCase();

  const coupons = await prisma.coupon.findMany({
    where: q ? { code: { contains: q.toUpperCase() } } : undefined,
    orderBy: { createdAt: "desc" },
  });

  let items = coupons.map(serializeAdminCoupon);
  if (status && status !== "ALL") {
    items = items.filter((c) => c.status === status);
  }

  return NextResponse.json({ items });
});

export const POST = route(async (request) => {
  await requireStaffApi(request);
  const data = await parseBody(couponInputSchema, request);

  const code = data.code.toUpperCase();
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) throw new ApiError(409, "Code already in use.", { code: ["Already in use"] });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      description: data.description || null,
      type: data.type,
      value: data.value,
      minOrderPaise: data.minOrderPaise,
      maxDiscountPaise: data.maxDiscountPaise ?? null,
      maxUses: data.maxUses ?? null,
      startsAt: data.startsAt ?? new Date(),
      expiresAt: data.expiresAt ?? null,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ id: coupon.id }, { status: 201 });
});
