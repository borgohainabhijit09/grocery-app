import { prisma, type NotificationLog } from "database";
import { ORDER_STATUS_LABELS } from "shared";
import { sendEmail } from "@/lib/email";
import { renderNotification, type OrderContext } from "@/lib/notification-templates";

const MAX_ATTEMPTS = 3;

type QueueInput = {
  userId?: string | null;
  channel?: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
  template: string;
  payload?: Record<string, unknown>;
};

/**
 * Record a notification as queued. Delivery happens in processNotificationQueue,
 * triggered by /api/cron/notifications or the admin Notifications page, so user
 * flows are never blocked or failed by a mail provider outage.
 */
export async function queueNotification(input: QueueInput): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: input.userId ?? null,
        channel: input.channel ?? "EMAIL",
        status: "QUEUED",
        template: input.template,
        payload: (input.payload ?? {}) as object,
      },
    });
  } catch {
    // Notification failures must never break the primary action.
  }
}

export type ProcessSummary = {
  scanned: number;
  sent: number;
  failed: number;
};

type ProcessOptions = {
  limit?: number;
  /** Restrict processing to specific notification ids (used by retry). */
  ids?: string[];
  /** Also retry previously failed rows that have attempts left. */
  includeFailed?: boolean;
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010";
}

async function resolveRecipient(row: NotificationLog): Promise<string | undefined> {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  if (typeof payload.email === "string" && payload.email) return payload.email;
  if (!row.userId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { email: true },
  });
  return user?.email ?? undefined;
}

async function buildOrderContext(orderId: string): Promise<OrderContext | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { id: true } },
      slot: true,
      deliveryPartner: { select: { name: true } },
    },
  });
  if (!order) return null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    fulfillmentType: order.fulfillmentType,
    totalPaise: order.totalPaise,
    itemCount: order.items.length,
    slotLabel: order.slot
      ? `${new Date(order.slot.date).toLocaleDateString("en-IN")} · ${order.slot.startTime} – ${order.slot.endTime}`
      : null,
    partnerName: order.deliveryPartner?.name ?? null,
  };
}

async function processRow(row: NotificationLog): Promise<{ sent: boolean; error?: string }> {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const email = await resolveRecipient(row);
  if (!email) return { sent: false, error: "No recipient email address." };

  const orderId = typeof payload.orderId === "string" ? payload.orderId : undefined;
  const order = orderId ? await buildOrderContext(orderId) : null;

  const recipientName = typeof payload.recipientName === "string" ? payload.recipientName : undefined;
  const isDeliveryPartner = row.template === "order_assigned";
  const link = isDeliveryPartner
    ? `${appUrl()}/delivery`
    : orderId
      ? `${appUrl()}/account/orders/${orderId}`
      : appUrl();

  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });

  const rendered = renderNotification({
    template: row.template,
    recipientName,
    storeName: settings?.storeName ?? undefined,
    contactPhone: settings?.contactPhone ?? undefined,
    payload,
    order,
    link,
  });

  const result = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  return result.ok ? { sent: true } : { sent: false, error: result.error ?? "Send failed." };
}

export async function processNotificationQueue(
  options: ProcessOptions = {}
): Promise<ProcessSummary> {
  const summary: ProcessSummary = { scanned: 0, sent: 0, failed: 0 };

  const where: Record<string, unknown> = options.ids
    ? { id: { in: options.ids } }
    : options.includeFailed
      ? {
          channel: "EMAIL",
          status: { in: ["QUEUED", "FAILED"] },
          attempts: { lt: MAX_ATTEMPTS },
        }
      : { channel: "EMAIL", status: "QUEUED" };

  const rows = await prisma.notificationLog.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 50,
  });

  for (const row of rows) {
    summary.scanned += 1;

    try {
      await prisma.notificationLog.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
      });

      const result = await processRow(row);

      await prisma.notificationLog.update({
        where: { id: row.id },
        data: result.sent
          ? { status: "SENT", sentAt: new Date(), error: null }
          : { status: "FAILED", error: result.error ?? "Send failed." },
      });

      if (result.sent) summary.sent += 1;
      else summary.failed += 1;
    } catch (err) {
      summary.failed += 1;
      try {
        await prisma.notificationLog.update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message : "Unexpected error.",
          },
        });
      } catch {
        // Best effort — a row we cannot update will be retried by the next run.
      }
    }
  }

  return summary;
}
