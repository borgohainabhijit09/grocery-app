"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/app/actions/cart";
import { cn } from "@/lib/utils";

type State = "idle" | "added" | "error";

export function QuickAdd({
  variantId,
  inStock,
  isLoggedIn,
  className,
}: {
  variantId: string | null;
  inStock: boolean;
  isLoggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || !variantId) return;
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction({ variantId, quantity: 1 });
      if (res.ok) {
        setState("added");
        router.refresh();
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 1500);
      } else {
        setError(res.error ?? "Could not add to cart.");
        setState("error");
      }
    });
  }

  if (!inStock || !variantId) {
    return (
      <span
        className={cn(
          "inline-flex h-8 items-center rounded-md border px-2.5 text-xs text-muted-foreground",
          className
        )}
      >
        Sold out
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Add to cart"
      title={error ?? "Add to cart"}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60",
        state === "added" && "border-green-500/40 bg-green-100 text-green-700",
        state === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        className
      )}
    >
      {state === "added" ? (
        <>
          <Check className="size-3.5" />
          Added
        </>
      ) : state === "error" ? (
        <>
          <ShoppingCart className="size-3.5" />
          Retry
        </>
      ) : (
        <>
          <Plus className="size-3.5" />
          Add
        </>
      )}
    </button>
  );
}
