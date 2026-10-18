"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { notifyWhenBackInStockAction } from "@/app/actions/stock-alerts";
import { Button } from "@/components/ui/button";

export function NotifyStockButton({
  productId,
  variantId,
  productName,
  hasUser,
}: {
  productId: string;
  variantId?: string | null;
  productName?: string | null;
  hasUser: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await notifyWhenBackInStockAction({
        productId,
        variantId,
        productName,
        email: hasUser ? undefined : email,
      });
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong. Please try again.");
    });
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-primary">
        You&rsquo;re on the list — we&rsquo;ll let you know as soon as it&rsquo;s back.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => (hasUser ? submit() : setOpen(true))}
          disabled={pending}
        >
          <BellRing className="size-4" />
          {pending ? "Adding..." : "Notify me when back in stock"}
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
          />
          <Button type="button" onClick={submit} disabled={pending || !email.trim()}>
            {pending ? "Adding..." : "Notify me"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
