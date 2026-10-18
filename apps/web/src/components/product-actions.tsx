"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { formatINR, stockState } from "shared";
import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { NotifyStockButton } from "@/components/notify-stock-button";

type Variant = {
  id: string;
  label: string;
  pricePaise: number;
  mrpPaise: number | null;
  stockQty: number;
  lowStockThreshold?: number | null;
};

export function ProductActions({
  variants,
  isLoggedIn,
  productId,
  productName,
}: {
  variants: Variant[];
  isLoggedIn: boolean;
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = variants.find((v) => v.id === variantId);
  const maxQty = selected ? Math.max(1, Math.min(99, selected.stockQty)) : 1;
  const inStock = (selected?.stockQty ?? 0) > 0;

  function handleAdd() {
    setMessage(null);
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const res = await addToCartAction({ variantId, quantity });
      if (res.error) {
        setMessage(res.error);
      } else {
        setMessage("Added to cart");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              setVariantId(v.id);
              setQuantity(1);
              setMessage(null);
            }}
            disabled={v.stockQty <= 0}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
              v.id === variantId
                ? "border-primary bg-primary/10 font-medium"
                : "hover:border-primary/50"
            }`}
          >
            {v.label} · {formatINR(v.pricePaise)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          className="flex-1"
          onClick={handleAdd}
          disabled={pending || !inStock}
        >
          <ShoppingCart className="size-4" />
          {!inStock ? "Out of stock" : pending ? "Adding..." : "Add to cart"}
        </Button>
      </div>

      {selected && (
        <p
          className={
            stockState(selected.stockQty, selected.lowStockThreshold ?? undefined) === "low"
              ? "text-xs font-medium text-amber-600"
              : "text-xs text-muted-foreground"
          }
        >
          {stockState(selected.stockQty, selected.lowStockThreshold ?? undefined) === "out"
            ? "Currently out of stock."
            : stockState(selected.stockQty, selected.lowStockThreshold ?? undefined) === "low"
              ? `Hurry — only ${selected.stockQty} left in stock.`
              : "In stock and ready to ship."}
        </p>
      )}

      {message && (
        <p
          className={`text-sm ${message === "Added to cart" ? "text-primary" : "text-destructive"}`}
        >
          {message}
        </p>
      )}

      {selected && !inStock && (
        <NotifyStockButton
          productId={productId}
          variantId={selected.id}
          productName={productName}
          hasUser={isLoggedIn}
        />
      )}
    </div>
  );
}
