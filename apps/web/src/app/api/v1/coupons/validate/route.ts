import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { evaluateCoupon } from "@/lib/coupon";
import { parseBody, route } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotalPaise: z.coerce.number().int().min(0),
});

/** Validate a coupon code against a subtotal. */
export const POST = route(async (request) => {
  const { code, subtotalPaise } = await parseBody(schema, request);

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  const ev = evaluateCoupon(coupon, subtotalPaise);

  if (!ev.valid) return NextResponse.json({ valid: false, error: ev.reason });
  return NextResponse.json({
    valid: true,
    code: ev.coupon.code,
    description: ev.coupon.description,
    discountPaise: ev.discountPaise,
  });
});
