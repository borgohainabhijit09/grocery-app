import { prisma } from "database";
import { queueNotification, processNotificationQueueSoon } from "@/lib/notifications";

export type StockAlertInput = {
  productId: string;
  variantId?: string | null;
  email?: string | null;
  userId?: string | null;
  productName?: string | null;
};

function readDiff(diff: unknown): Record<string, unknown> {
  return diff && typeof diff === "object" ? (diff as Record<string, unknown>) : {};
}

/**
 * Record a "notify me when back in stock" request. Stored as an AuditLog row
 * (entity "StockAlert") so no schema migration is required. Requests are
 * de-duplicated per product/variant/contact while still pending.
 */
export async function subscribeStockAlert(input: StockAlertInput): Promise<void> {
  const email = input.email?.trim().toLowerCase() || null;
  const userId = input.userId || null;
  if (!email && !userId) return;

  try {
    const existing = await prisma.auditLog.findMany({
      where: { entity: "StockAlert", action: "SUBSCRIBE" },
      select: { diff: true },
    });

    const dupe = existing.some((row) => {
      const d = readDiff(row.diff);
      if (d.notifiedAt) return false;
      if (d.productId !== input.productId) return false;
      if ((d.variantId ?? null) !== (input.variantId ?? null)) return false;
      return (d.email ?? null) === email && (d.userId ?? null) === userId;
    });
    if (dupe) return;

    await prisma.auditLog.create({
      data: {
        entity: "StockAlert",
        action: "SUBSCRIBE",
        actorId: userId,
        diff: {
          productId: input.productId,
          variantId: input.variantId ?? null,
          email,
          userId,
          productName: input.productName ?? null,
          notifiedAt: null,
        },
      },
    });
  } catch {
    // Never break the primary request.
  }
}

/**
 * Notify everyone awaiting a variant that it is available again. Returns the
 * number of alerts fulfilled.
 */
export async function notifyStockAlertsForVariant(variantId: string): Promise<number> {
  let notified = 0;
  try {
    const rows = await prisma.auditLog.findMany({
      where: { entity: "StockAlert", action: "SUBSCRIBE" },
    });

    for (const row of rows) {
      const d = readDiff(row.diff);
      if (d.notifiedAt) continue;
      if (d.variantId !== variantId) continue;

      const userId = typeof d.userId === "string" ? d.userId : null;
      const email = typeof d.email === "string" ? d.email : null;
      if (!userId && !email) continue;

      await queueNotification({
        userId,
        template: "back_in_stock",
        payload: {
          productId: d.productId,
          variantId,
          productName: typeof d.productName === "string" ? d.productName : undefined,
          email: email ?? undefined,
        },
      });

      await prisma.auditLog.update({
        where: { id: row.id },
        data: { diff: { ...d, notifiedAt: new Date().toISOString() } },
      });
      notified += 1;
    }

    if (notified > 0) processNotificationQueueSoon();
  } catch {
    // Best effort — restocking must not fail because of alerts.
  }
  return notified;
}
