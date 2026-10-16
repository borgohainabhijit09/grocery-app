"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, type OrderStatus } from "shared";
import { updateDeliveryStatusAction } from "@/app/actions/delivery";
import { Button } from "@/components/ui/button";

const ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PACKED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
};

const LABELS: Partial<Record<OrderStatus, string>> = {
  OUT_FOR_DELIVERY: "Start delivery",
  COMPLETED: "Mark delivered",
};

export function DeliveryOrderActions({
  orderId,
  status,
  size = "sm",
}: {
  orderId: string;
  status: OrderStatus;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nexts = ALLOWED[status] ?? [];
  if (nexts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nexts.map((next) => (
          <Button
            key={next}
            size={size}
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await updateDeliveryStatusAction(orderId, next);
                if (res.ok) {
                  router.refresh();
                } else {
                  setError(res.error ?? "Update failed.");
                }
              });
            }}
          >
            {pending ? "Updating…" : LABELS[next] ?? `Mark ${ORDER_STATUS_LABELS[next]}`}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
