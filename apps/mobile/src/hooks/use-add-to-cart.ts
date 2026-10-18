import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { errMessage } from "@/lib/errors";

/** Returns an `add(variantId, qty)` that handles auth + error alerting. */
export function useAddToCart() {
  const { user } = useAuth();
  const { add } = useCart();
  const router = useRouter();

  return useCallback(
    async (variantId: string, quantity = 1) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        await add(variantId, quantity);
      } catch (err) {
        Alert.alert("Cart", errMessage(err));
      }
    },
    [user, add, router]
  );
}
