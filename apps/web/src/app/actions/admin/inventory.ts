"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { z } from "zod";
import { requireStaff } from "@/lib/auth-guard";
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
    await prisma.productVariant.update({
      where: { id: parsed.data.variantId },
      data: { stockQty: parsed.data.stockQty },
    });
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
