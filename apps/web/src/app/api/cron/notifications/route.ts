import { NextResponse } from "next/server";
import { processNotificationQueue } from "@/lib/notifications";

/**
 * Notification outbox processor. Point a scheduler (Vercel Cron, GitHub Actions,
 * system cron) at this endpoint, or trigger it from the admin Notifications page.
 *
 * Auth: requires x-cron-secret (or ?secret=) to match CRON_SECRET when it is set.
 * CRON_SECRET is mandatory in production.
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";

  if (secret) {
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  const includeFailed = url.searchParams.get("retryFailed") === "1";

  try {
    const summary = await processNotificationQueue({ includeFailed });
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}

export { handle as GET, handle as POST };
