"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { couponInputSchema } from "shared";
import { requireStaff } from "@/lib/auth-guard";
import { fieldErrorsFrom, toDbError, type FormState } from "./_shared";

function revalidate() {
  revalidatePath("/admin/coupons");
}

export async function createCouponAction(input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return { ok: false, error: "Code already in use.", fieldErrors: { code: ["Already in use"] } };
  }

  try {
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
    revalidate();
    return { ok: true, id: coupon.id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function updateCouponAction(id: string, input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = couponInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  const conflict = await prisma.coupon.findFirst({ where: { code, NOT: { id } } });
  if (conflict) {
    return { ok: false, error: "Code already in use.", fieldErrors: { code: ["Already in use"] } };
  }

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Coupon not found." };

  try {
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
    revalidate();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function deleteCouponAction(id: string): Promise<FormState> {
  await requireStaff();

  try {
    await prisma.coupon.delete({ where: { id } });
    revalidate();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function toggleCouponAction(id: string): Promise<FormState> {
  await requireStaff();

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Coupon not found." };

  try {
    await prisma.coupon.update({ where: { id }, data: { isActive: !existing.isActive } });
    revalidate();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
