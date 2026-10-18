import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Cart } from "@/lib/types";
import { useAuth } from "./auth";

const EMPTY: Cart = { items: [], subtotalPaise: 0, count: 0 };

type CartState = {
  cart: Cart;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  clear: () => Promise<void>;
  clearLocal: () => void;
  reorder: (orderId: string) => Promise<void>;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(EMPTY);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCart(await api.cart());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cart.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mutate = useCallback(async (fn: () => Promise<Cart>) => {
    setError(null);
    try {
      setCart(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cart update failed.");
      throw err;
    }
  }, []);

  const add = useCallback(
    (variantId: string, quantity = 1) => mutate(() => api.cartAdd(variantId, quantity)),
    [mutate]
  );
  const update = useCallback(
    (variantId: string, quantity: number) => mutate(() => api.cartUpdate(variantId, quantity)),
    [mutate]
  );
  const remove = useCallback(
    (variantId: string) => mutate(() => api.cartRemove(variantId)),
    [mutate]
  );
  const clear = useCallback(() => mutate(() => api.cartClear()), [mutate]);
  const clearLocal = useCallback(() => setCart(EMPTY), []);
  const reorder = useCallback((orderId: string) => mutate(() => api.reorder(orderId)), [mutate]);

  const value = useMemo<CartState>(
    () => ({ cart, loading, error, refresh, add, update, remove, clear, clearLocal, reorder }),
    [cart, loading, error, refresh, add, update, remove, clear, clearLocal, reorder]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
