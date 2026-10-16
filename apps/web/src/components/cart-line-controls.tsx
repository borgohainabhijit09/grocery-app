"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

export function CartLineControls({
  variantId,
  quantity,
  maxQty,
}: {
  variantId: string;
  quantity: number;
  maxQty: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setQty(next: number) {
    startTransition(async () => {
      await updateCartItemAction({ variantId, quantity: next });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(variantId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-md border">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setQty(quantity - 1)}
          disabled={pending || quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-9 text-center text-sm tabular-nums">{quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setQty(quantity + 1)}
          disabled={pending || quantity >= maxQty}
          aria-label="Increase quantity"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={remove}
        disabled={pending}
        aria-label="Remove item"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
