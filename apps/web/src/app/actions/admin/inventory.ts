"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { z } from "zod";
import { requireStaff } from "@/lib/auth-guard";
import { notifyStockAlertsForVariant } from "@/lib/stock-alerts";
import { toDbError, type FormState } from "./_shared";

function revalidate() {
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

const stockSchema = z.object({
  variantId: z.string().min(1),
  stockQty: z.coerce.number().int().min(0).max(1_000_000),
});

export async function setStockAction(input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid stock quantity." };

  try {
    const before = await prisma.productVariant.findUnique({
      where: { id: parsed.data.variantId },
      select: { stockQty: true },
    });
    await prisma.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { stockQty: parsed.data.stockQty },
    });
    if (before && before.stockQty <= 0 && parsed.data.stockQty > 0) {
      await notifyStockAlertsForVariant(parsed.data.variantId);
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

const adjustSchema = z.object({
  variantId: z.string().min(1),
  delta: z.coerce.number().int().min(-100_000).max(100_000),
});

export async function adjustStockAction(input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid adjustment." };

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: parsed.data.variantId },
      select: { stockQty: true },
    });
    if (!variant) return { ok: false, error: "Variant not found." };

    const next = Math.max(0, variant.stockQty + parsed.data.delta);
    await prisma.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { stockQty: next },
    });
    if (variant.stockQty <= 0 && next > 0) {
      await notifyStockAlertsForVariant(parsed.data.variantId);
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

const bulkStockSchema = z.object({
  variantIds: z.array(z.string().min(1)).min(1),
  mode: z.enum(["set", "add"]),
  value: z.coerce.number().int().min(-1_000_000).max(1_000_000),
});

export async function bulkSetStockAction(input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = bulkStockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid stock value." };

  const { variantIds, mode } = parsed.data;
  if (mode === "set" && parsed.data.value < 0) {
    return { ok: false, error: "Stock cannot be negative." };
  }

  try {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stockQty: true },
    });

    const restocked: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const variant of variants) {
        const next =
          mode === "set" ? parsed.data.value : Math.max(0, variant.stockQty + parsed.data.value);
        await tx.productVariant.update({ where: { id: variant.id }, data: { stockQty: next } });
        if (variant.stockQty <= 0 && next > 0) restocked.push(variant.id);
      }
    });

    for (const variantId of restocked) {
      await notifyStockAlertsForVariant(variantId);
    }

    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

const thresholdSchema = z.object({
  variantId: z.string().min(1),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000),
});

export async function setThresholdAction(input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = thresholdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid threshold." };

  try {
    await prisma.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { lowStockThreshold: parsed.data.lowStockThreshold },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
