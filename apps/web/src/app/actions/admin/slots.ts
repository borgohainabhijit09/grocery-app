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

const bulkWindowSchema = z.object({
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  capacity: z.coerce.number().int().min(0).max(100_000),
});

const bulkSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  windows: z.array(bulkWindowSchema).min(1),
  isActive: z.boolean().default(true),
});

export async function bulkCreateSlotsAction(
  input: unknown,
): Promise<FormState & { count?: number }> {
  await requireStaff();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the details and try again." };

  const { startDate, endDate, daysOfWeek, windows, isActive } = parsed.data;

  for (const w of windows) {
    if (w.startTime >= w.endTime)
      return { ok: false, error: "End time must be after start time." };
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (start > end) return { ok: false, error: "Start date must be before end date." };

  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (daysOfWeek.includes(cur.getUTCDay())) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (dates.length === 0)
    return { ok: false, error: "No matching dates in the selected range and days." };

  const data = dates.flatMap((date) =>
    windows.map((w) => ({
      date,
      startTime: w.startTime,
      endTime: w.endTime,
      fulfillmentType: w.fulfillmentType,
      capacity: w.capacity,
      isActive,
    })),
  );

  try {
    const result = await prisma.slot.createMany({ data, skipDuplicates: true });
    revalidate();
    return { ok: true, count: result.count };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
