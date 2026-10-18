"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { formatINR } from "shared";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  maxQty: number;
  pricePaise: number;
  lineTotalPaise: number;
  label: string;
  name: string;
  slug: string;
  image: string | null;
};

export function CartDrawer({
  cartCount,
  isLoggedIn,
}: {
  cartCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CartLine[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const data = (await res.json()) as { items: CartLine[] };
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function openDrawer() {
    setOpen(true);
    void load();
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const subtotal = items.reduce((sum, it) => sum + it.lineTotalPaise, 0);

  function changeQty(line: CartLine, next: number) {
    setPendingId(line.variantId);
    startTransition(async () => {
      await updateCartItemAction({ variantId: line.variantId, quantity: next });
      await load();
      router.refresh();
      setPendingId(null);
    });
  }

  function remove(line: CartLine) {
    setPendingId(line.variantId);
    startTransition(async () => {
      await removeCartItemAction(line.variantId);
      await load();
      router.refresh();
      setPendingId(null);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={openDrawer}
        aria-label="Open cart"
      >
        <ShoppingCart className="size-4" />
        <span className="hidden sm:inline">Cart</span>
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        )}
      </Button>

      {open &&
        createPortal(
          <>
            <div
              onClick={() => setOpen(false)}
              aria-hidden="true"
              className="animate-fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            />

            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Your cart"
              className="animate-slide-in-right fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b px-5 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ShoppingCart className="size-5" />
                  Your cart
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close cart"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!isLoggedIn ? (
                  <div className="mt-10 flex flex-col items-center gap-4 text-center">
                    <span className="text-4xl">🔐</span>
                    <p className="text-sm text-muted-foreground">
                      Please log in to view items in your cart.
                    </p>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/login?next=/cart">Log in</Link>
                    </Button>
                  </div>
                ) : loading && items.length === 0 ? (
                  <ul className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex animate-pulse gap-3">
                        <div className="size-16 shrink-0 rounded-lg bg-secondary" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 w-2/3 rounded bg-secondary" />
                          <div className="h-3 w-1/3 rounded bg-secondary" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : items.length === 0 ? (
                  <div className="mt-10 flex flex-col items-center gap-4 text-center">
                    <span className="text-4xl">🛒</span>
                    <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link href="/shop">Browse products</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {items.map((line) => (
                      <li key={line.id} className="flex gap-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-secondary">
                          {line.image && (
                            <Image
                              src={line.image}
                              alt={line.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <Link
                            href={`/product/${line.slug}`}
                            onClick={() => setOpen(false)}
                            className="truncate text-sm font-medium hover:text-primary"
                          >
                            {line.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">{line.label}</span>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center rounded-md border">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => changeQty(line, line.quantity - 1)}
                                disabled={pendingId === line.variantId || line.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="w-8 text-center text-sm tabular-nums">
                                {line.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => changeQty(line, line.quantity + 1)}
                                disabled={
                                  pendingId === line.variantId || line.quantity >= line.maxQty
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatINR(line.lineTotalPaise)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => remove(line)}
                              disabled={pendingId === line.variantId}
                              aria-label="Remove item"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isLoggedIn && items.length > 0 && (
                <div className="border-t px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-base font-semibold">{formatINR(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Delivery and taxes are calculated at checkout.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOpen(false)}
                    >
                      <Link href="/cart">View cart</Link>
                    </Button>
                    <Button asChild className="flex-1" onClick={() => setOpen(false)}>
                      <Link href="/checkout">Checkout</Link>
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
