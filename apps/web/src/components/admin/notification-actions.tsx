"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  processNotificationsAction,
  retryNotificationAction,
} from "@/app/actions/admin/notifications";
import { Button } from "@/components/ui/button";

export function NotificationQueueActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(includeFailed: boolean) {
    setMessage(null);
    startTransition(async () => {
      const res = await processNotificationsAction(includeFailed);
      if (res.ok) {
        setMessage(
          `Processed ${res.scanned ?? 0}: sent ${res.sent ?? 0}, failed ${res.failed ?? 0}.`
        );
        router.refresh();
      } else {
        setMessage(res.error ?? "Processing failed.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(false)}>
        {pending ? "Processing…" : "Send pending"}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(true)}>
        Retry failed
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}

export function RetryNotificationButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending || disabled}
      onClick={() => {
        startTransition(async () => {
          await retryNotificationAction(id);
          router.refresh();
        });
      }}
    >
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}
