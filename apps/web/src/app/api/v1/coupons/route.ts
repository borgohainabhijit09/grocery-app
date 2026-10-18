import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";
import { serializePublicCoupon } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Active, currently-valid coupons customers can apply at checkout. */
export const GET = route(async () => {
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: [{ minOrderPaise: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  const items = coupons
    .filter((c) => c.maxUses == null || c.usedCount < c.maxUses)
    .map(serializePublicCoupon);

  return NextResponse.json({ items });
});
