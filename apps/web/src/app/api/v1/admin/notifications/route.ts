import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOTIFICATION_STATUSES, type NotificationStatus } from "shared";
import { route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeNotification } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Notification outbox with status filter and counts. */
export const GET = route(async (request) => {
  await requireStaffApi(request);
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const statusParam = sp.get("status");
  const status = (NOTIFICATION_STATUSES as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as NotificationStatus)
    : undefined;

  const where = status ? { status } : {};

  const [rows, total, statusCounts] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((v): v is string => !!v)));
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c._count._all]));

  return NextResponse.json({
    items: rows.map((r) => serializeNotification(r, r.userId ? emailById.get(r.userId) ?? null : null)),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    statusCounts: counts,
  });
});
