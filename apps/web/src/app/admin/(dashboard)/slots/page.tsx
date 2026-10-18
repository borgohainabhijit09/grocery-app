import { prisma } from "database";
import { SlotsManager, type SlotRow } from "./_components/slots-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Slots" };

export default async function SlotsPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const slots = await prisma.slot.findMany({
    where: { date: { gte: today } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
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
    booked.filter((b) => b.slotId).map((b) => [b.slotId as string, b._count._all]),
  );

  const rows: SlotRow[] = slots.map((s) => {
    const used = bookedBySlot.get(s.id) ?? 0;
    return {
      id: s.id,
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      fulfillmentType: s.fulfillmentType,
      capacity: s.capacity,
      booked: used,
      available: Math.max(0, s.capacity - used),
      isActive: s.isActive,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Delivery &amp; pickup slots</h1>
        <p className="text-sm text-muted-foreground">
          Manage the time windows customers can choose at checkout. Showing today onwards.
        </p>
      </div>
      <SlotsManager slots={rows} />
    </div>
  );
}
