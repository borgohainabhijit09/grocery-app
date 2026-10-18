import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { processNotificationQueue } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ includeFailed: z.coerce.boolean().optional().default(false) });

/** Drain the notification outbox (optionally retrying failed rows). */
export const POST = route(async (request) => {
  await requireStaffApi(request);
  const { includeFailed } = await parseBody(schema, request);

  const summary = await processNotificationQueue({ includeFailed, limit: 100 });
  return NextResponse.json({ ok: true, ...summary });
});
