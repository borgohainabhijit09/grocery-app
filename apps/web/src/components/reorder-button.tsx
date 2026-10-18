"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { reorderAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

export function ReorderButton({
  orderId,
  variant = "outline",
  size = "sm",
  className,
}: {
  orderId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleReorder() {
    setMessage(null);
    startTransition(async () => {
      const res = await reorderAction(orderId);
      if (res.ok) {
        router.push("/cart");
      } else {
        setMessage(res.error ?? "Could not add items to cart.");
      }
    });
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleReorder}
        disabled={pending}
      >
        <RotateCcw className="size-4" />
        {pending ? "Adding..." : "Buy again"}
      </Button>
      {message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
