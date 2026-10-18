import { auth } from "@/auth";
import { prisma } from "database";
import { toRupees } from "shared";

export const runtime = "nodejs";

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "STAFF")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: true,
      deliveryPartner: { select: { name: true } },
    },
    orderBy: { placedAt: "desc" },
  });

  const header = [
    "Order",
    "Placed",
    "Customer",
    "Email",
    "Phone",
    "Status",
    "Payment",
    "Fulfillment",
    "Delivery partner",
    "Items",
    "Total",
  ];

  const lines: string[] = [header.join(",")];

  for (const o of orders) {
    lines.push(
      [
        o.orderNumber,
        new Date(o.placedAt).toISOString(),
        o.user.name,
        o.user.email,
        o.user.phone ?? "",
        o.status,
        o.paymentStatus,
        o.fulfillmentType,
        o.deliveryPartner?.name ?? "",
        o.items.length,
        toRupees(o.totalPaise),
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
    },
  });
}
