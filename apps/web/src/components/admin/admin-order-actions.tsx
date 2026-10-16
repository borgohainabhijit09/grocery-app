"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from "shared";
import {
  markOrderPaidAction,
  updateOrderStatusAction,
} from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  orderId: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
};

export function AdminOrderActions({ orderId, status, paymentStatus, paymentMethod }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextStatuses = ORDER_STATUS_FLOW[status] ?? [];
  const isCod = paymentMethod === "COD";

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, clearNote = false) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (clearNote) setNote("");
        router.refresh();
      } else {
        setError(res.error ?? "Action failed.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">This order is in a final state.</p>
        ) : (
          <>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)…"
              maxLength={500}
            />
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === "CANCELLED" || s === "REFUNDED" ? "destructive" : "default"}
                  disabled={pending}
                  onClick={() => run(() => updateOrderStatusAction(orderId, s, note), true)}
                >
                  Mark {ORDER_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </>
        )}

        {paymentStatus !== "PAID" && paymentStatus !== "REFUNDED" ? (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => markOrderPaidAction(orderId))}
            >
              Mark payment received{isCod ? " (cash)" : ""}
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
