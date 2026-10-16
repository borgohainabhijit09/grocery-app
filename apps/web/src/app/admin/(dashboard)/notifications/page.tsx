import Link from "next/link";
import { prisma } from "database";
import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TEMPLATE_LABELS,
  type NotificationStatus,
} from "shared";
import {
  NotificationQueueActions,
  RetryNotificationButton,
} from "@/components/admin/notification-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

const PAGE_SIZE = 20;

type SearchParams = { status?: string; page?: string };

const STATUS_STYLES: Record<NotificationStatus, string> = {
  QUEUED: "bg-amber-100 text-amber-800",
  SENT: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};

function templateLabel(template: string): string {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_TEMPLATE_LABELS, template)
    ? NOTIFICATION_TEMPLATE_LABELS[
        template as keyof typeof NOTIFICATION_TEMPLATE_LABELS
      ]
    : template;
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = NOTIFICATION_STATUSES.includes(
    (sp.status ?? "") as NotificationStatus
  )
    ? (sp.status as NotificationStatus)
    : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

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

  const userIds = Array.from(
    new Set(rows.map((r) => r.userId).filter((v): v is string => !!v))
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const counts = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count._all])
  ) as Partial<Record<NotificationStatus, number>>;

  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { status, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return `/admin/notifications${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {total} total · {counts.QUEUED ?? 0} queued · {counts.SENT ?? 0} sent ·{" "}
            {counts.FAILED ?? 0} failed
          </p>
        </div>
        <NotificationQueueActions />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref({ status: undefined, page: "1" })}
          className={`rounded-md border px-3 py-1 text-sm ${!status ? "bg-secondary font-medium" : "hover:bg-accent"}`}
        >
          All
        </Link>
        {NOTIFICATION_STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref({ status: s, page: "1" })}
            className={`rounded-md border px-3 py-1 text-sm ${status === s ? "bg-secondary font-medium" : "hover:bg-accent"}`}
          >
            {s}
            {counts[s] ? (
              <span className="ml-1 text-xs text-muted-foreground">{counts[s]}</span>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Template</th>
              <th className="px-4 py-2 font-medium">Recipient</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Attempts</th>
              <th className="px-4 py-2 font-medium">Error</th>
              <th className="px-4 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No notifications yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const payload = (row.payload ?? {}) as Record<string, unknown>;
                const recipient =
                  (row.userId ? emailById.get(row.userId) : null) ??
                  (typeof payload.email === "string" ? payload.email : "—");
                const orderNumber =
                  typeof payload.orderNumber === "string" ? payload.orderNumber : null;

                return (
                  <tr key={row.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-2">
                      <div>{templateLabel(row.template)}</div>
                      <div className="text-xs text-muted-foreground">
                        {orderNumber ?? row.channel}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{recipient}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                      >
                        {row.status}
                      </span>
                      {row.sentAt ? (
                        <div className="text-xs text-muted-foreground">
                          {new Date(row.sentAt).toLocaleTimeString("en-IN")}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.attempts}</td>
                    <td className="max-w-[16rem] px-4 py-2 text-xs text-muted-foreground">
                      {row.error ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <RetryNotificationButton id={row.id} disabled={row.status === "SENT"} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: String(page - 1) })}>Previous</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref({ page: String(page + 1) })}>Next</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
