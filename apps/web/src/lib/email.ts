type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/**
 * Resend is optional. When RESEND_API_KEY / MAIL_FROM are not configured (the
 * default for local dev) we log and report success so notification flows never
 * break, then mark the outbox row as sent.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.log(`[email:mock] to=${input.to} subject="${input.subject}"`);
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? undefined,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `${res.status} ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
