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

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      orders: {
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        select: { totalPaise: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Name",
    "Email",
    "Phone",
    "Phone verified",
    "Status",
    "Orders",
    "Total spent",
    "Joined",
  ];

  const lines: string[] = [header.join(",")];

  for (const c of customers) {
    const total = c.orders.reduce((sum, o) => sum + o.totalPaise, 0);
    lines.push(
      [
        c.name,
        c.email,
        c.phone ?? "",
        c.phoneVerifiedAt ? "yes" : "no",
        c.isActive ? "active" : "disabled",
        c.orders.length,
        toRupees(total),
        new Date(c.createdAt).toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${date}.csv"`,
    },
  });
}
