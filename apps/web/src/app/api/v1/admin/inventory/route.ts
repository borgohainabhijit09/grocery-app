import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { notifyStockAlertsForVariant } from "@/lib/stock-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set"),
    variantId: z.string().min(1),
    stockQty: z.coerce.number().int().min(0).max(1_000_000),
  }),
  z.object({
    action: z.literal("adjust"),
    variantId: z.string().min(1),
    delta: z.coerce.number().int().min(-100_000).max(100_000),
  }),
  z.object({
    action: z.literal("threshold"),
    variantId: z.string().min(1),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000),
  }),
]);

/** All variants with stock info (lowest stock first). */
export const GET = route(async (request) => {
  await requireStaffApi(request);

  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ stockQty: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: variants.map((v) => ({
      variantId: v.id,
      productId: v.product.id,
      productName: v.product.name,
      variantLabel: v.label,
      sku: v.sku,
      stockQty: v.stockQty,
      lowStockThreshold: v.lowStockThreshold,
      isActive: v.isActive,
    })),
  });
});

/** Set / adjust stock, or set the low-stock threshold. */
export const POST = route(async (request) => {
  await requireStaffApi(request);
  const body = await parseBody(actionSchema, request);

  if (body.action === "set") {
    const before = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      select: { stockQty: true },
    });
    await prisma.productVariant.update({
      where: { id: body.variantId },
      data: { stockQty: body.stockQty },
    });
    if (before && before.stockQty <= 0 && body.stockQty > 0) {
      await notifyStockAlertsForVariant(body.variantId);
    }
  } else if (body.action === "threshold") {
    await prisma.productVariant.update({
      where: { id: body.variantId },
      data: { lowStockThreshold: body.lowStockThreshold },
    });
  } else {
    const variant = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      select: { stockQty: true },
    });
    if (!variant) throw NOT_FOUND("Variant");
    const next = Math.max(0, variant.stockQty + body.delta);
    await prisma.productVariant.update({
      where: { id: body.variantId },
      data: { stockQty: next },
    });
    if (variant.stockQty <= 0 && next > 0) {
      await notifyStockAlertsForVariant(body.variantId);
    }
  }

  const updated = await prisma.productVariant.findUnique({
    where: { id: body.variantId },
    select: { id: true, stockQty: true, lowStockThreshold: true },
  });
  if (!updated) throw new ApiError(404, "Variant not found.");

  return NextResponse.json({
    variantId: updated.id,
    stockQty: updated.stockQty,
    lowStockThreshold: updated.lowStockThreshold,
  });
});
