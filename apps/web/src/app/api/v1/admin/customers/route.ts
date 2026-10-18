import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminCustomer } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

/** Customer list with order counts and lifetime spend. */
export const GET = route(async (request) => {
  await requireStaffApi(request);
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const q = sp.get("q")?.trim() || undefined;

  const where = {
    role: "CUSTOMER" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        phoneVerifiedAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const ids = customers.map((c) => c.id);
  const spend = ids.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: ids }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { totalPaise: true },
      })
    : [];
  const spendByUser = new Map(spend.map((s) => [s.userId, s._sum.totalPaise ?? 0]));

  return NextResponse.json({
    items: customers.map((c) => serializeAdminCustomer(c, spendByUser.get(c.id) ?? 0)),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});
