"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { z } from "zod";
import { requireStaff } from "@/lib/auth-guard";
import { toDbError, type FormState } from "./_shared";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  capacity: z.coerce.number().int().min(0).max(100_000),
  isActive: z.boolean().default(true),
});

function revalidate() {
  revalidatePath("/admin/slots");
  revalidatePath("/checkout");
}

export async function createSlotAction(input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the slot details and try again." };

  const { date, startTime, endTime, fulfillmentType, capacity, isActive } = parsed.data;
  if (startTime >= endTime) return { ok: false, error: "End time must be after start time." };

  try {
    await prisma.slot.create({
      data: {
        date: new Date(`${date}T00:00:00.000Z`),
        startTime,
        endTime,
        fulfillmentType,
        capacity,
        isActive,
      },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function updateSlotAction(id: string, input: unknown): Promise<FormState> {
  await requireStaff();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the slot details and try again." };

  const { date, startTime, endTime, fulfillmentType, capacity, isActive } = parsed.data;
  if (startTime >= endTime) return { ok: false, error: "End time must be after start time." };

  const existing = await prisma.slot.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Slot not found." };

  try {
    await prisma.slot.update({
      where: { id },
      data: {
        date: new Date(`${date}T00:00:00.000Z`),
        startTime,
        endTime,
        fulfillmentType,
        capacity,
        isActive,
      },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function toggleSlotAction(id: string): Promise<FormState> {
  await requireStaff();

  const existing = await prisma.slot.findUnique({ where: { id }, select: { isActive: true } });
  if (!existing) return { ok: false, error: "Slot not found." };

  try {
    await prisma.slot.update({ where: { id }, data: { isActive: !existing.isActive } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function deleteSlotAction(id: string): Promise<FormState> {
  await requireStaff();

  try {
    const orders = await prisma.order.count({ where: { slotId: id } });
    if (orders > 0) {
      return { ok: false, error: "This slot has orders — deactivate it instead of deleting." };
    }
    await prisma.slot.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
