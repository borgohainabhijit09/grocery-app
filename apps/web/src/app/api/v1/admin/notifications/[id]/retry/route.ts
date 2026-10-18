import { NextResponse } from "next/server";
import { prisma } from "database";
import { ApiError, NOT_FOUND, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { processNotificationQueue } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Force a specific notification through the sender again. */
export const POST = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const row = await prisma.notificationLog.findUnique({ where: { id } });
  if (!row) throw NOT_FOUND("Notification");
  if (row.status === "SENT") throw new ApiError(400, "This notification was already sent.");

  const summary = await processNotificationQueue({ ids: [id] });
  return NextResponse.json({ ok: true, ...summary });
});
