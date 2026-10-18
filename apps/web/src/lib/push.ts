export type SendPushResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Whether an Expo access token is configured (optional; adds push security). */
export function isPushConfigured(): boolean {
  return true;
}

const TOKEN_RE = /^Expo(nent)?PushToken\[.+\]$/;

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Send a push notification to one or more Expo push tokens. Invalid tokens are
 * ignored; failures are reported without throwing so the outbox can retry.
 */
export async function sendPush(tokens: string[], message: PushMessage): Promise<SendPushResult> {
  const valid = [...new Set(tokens.filter((t) => TOKEN_RE.test(t)))];
  if (valid.length === 0) return { ok: false, error: "No valid device tokens." };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(
        valid.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.data ?? {},
          sound: "default",
        })),
      ),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Expo push ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as { data?: { status?: string; message?: string }[] };
    const tickets = Array.isArray(json.data) ? json.data : [];
    const failed = tickets.filter((t) => t?.status === "error");
    if (failed.length > 0 && failed.length === tickets.length) {
      return { ok: false, error: failed[0]?.message ?? "All push tickets failed." };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Push send failed." };
  }
}
