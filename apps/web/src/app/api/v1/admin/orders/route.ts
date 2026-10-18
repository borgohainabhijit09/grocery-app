import { NextResponse } from "next/server";
import { prisma } from "database";
import { ORDER_STATUSES } from "shared";
import { route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeOrder } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

/** Admin order list with status/customer filters. */
export const GET = route(async (request) => {
  await requireStaffApi(request);
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const q = sp.get("q")?.trim() || undefined;
  const statusParam = sp.get("status");
  const status = (ORDER_STATUSES as readonly string[]).includes(statusParam ?? "")
    ? statusParam
    : undefined;
  const unassigned = sp.get("assign") === "unassigned";

  const where = {
    ...(status ? { status: status as (typeof ORDER_STATUSES)[number] } : {}),
    ...(unassigned ? { deliveryPartnerId: null } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { phone: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [orders, total, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        deliveryPartner: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c._count._all]));

  return NextResponse.json({
    items: orders.map(serializeOrder),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    statusCounts: counts,
  });
});
