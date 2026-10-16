"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { requireStaff } from "@/lib/auth-guard";
import { processNotificationQueue } from "@/lib/notifications";
import { toDbError } from "./_shared";

export type NotificationProcessResult = {
  ok?: boolean;
  scanned?: number;
  sent?: number;
  failed?: number;
  error?: string;
};

/** Drain the notification outbox (optionally retrying failed rows too). */
export async function processNotificationsAction(
  includeFailed = false
): Promise<NotificationProcessResult> {
  await requireStaff();

  try {
    const summary = await processNotificationQueue({ includeFailed, limit: 100 });
    revalidatePath("/admin/notifications");
    return { ok: true, ...summary };
  } catch (err) {
    return toDbError(err);
  }
}

/** Force a specific notification through the sender again. */
export async function retryNotificationAction(
  id: string
): Promise<NotificationProcessResult> {
  await requireStaff();

  try {
    const row = await prisma.notificationLog.findUnique({ where: { id } });
    if (!row) return { error: "Notification not found." };
    if (row.status === "SENT") return { error: "This notification was already sent." };

    const summary = await processNotificationQueue({ ids: [id] });
    revalidatePath("/admin/notifications");
    return { ok: true, ...summary };
  } catch (err) {
    return toDbError(err);
  }
}
