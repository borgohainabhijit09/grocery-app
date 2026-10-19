import { NextResponse } from "next/server";
import { prisma } from "database";
import { ApiError, route } from "@/lib/api-helpers";
import { serializeSlot } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Available slots.
 *   GET /api/v1/slots?date=YYYY-MM-DD&fulfillmentType=DELIVERY
 * When `date` is omitted, returns active slots for today onwards.
 */
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const dateParam = sp.get("date");
  const fulfillmentType = sp.get("fulfillmentType");

  if (fulfillmentType && fulfillmentType !== "DELIVERY" && fulfillmentType !== "PICKUP") {
    throw new ApiError(400, "Invalid fulfillmentType.");
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let dateFilter = {};
  if (dateParam) {
    const date = new Date(`${dateParam}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "Invalid date. Use YYYY-MM-DD.");
    dateFilter = { date };
  } else {
    dateFilter = { date: { gte: todayMidnight } };
  }

  const rawSlots = await prisma.slot.findMany({
    where: {
      isActive: true,
      ...dateFilter,
      ...(fulfillmentType ? { fulfillmentType: fulfillmentType as "DELIVERY" | "PICKUP" } : {}),
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const slots = rawSlots.filter((sl) => {
    const slotDay = new Date(sl.date.getFullYear(), sl.date.getMonth(), sl.date.getDate());
    if (slotDay.getTime() > todayMidnight.getTime()) return true;
    return sl.startTime > currentTimeStr;
  });

  const booked =
    slots.length > 0
      ? await prisma.order.groupBy({
          by: ["slotId"],
          where: {
            slotId: { in: slots.map((s) => s.id) },
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
          _count: { _all: true },
        })
      : [];

  const bookedBySlot = new Map(
    booked.filter((b) => b.slotId).map((b) => [b.slotId as string, b._count._all])
  );

  return NextResponse.json({
    items: slots.map((s) => serializeSlot(s, bookedBySlot.get(s.id) ?? 0)),
  });
});
