import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, ErrorText, Loading } from "@/components/ui";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, loading, error, update, remove } = useCart();

  const changeQty = useCallback(
    async (item: CartItem, next: number) => {
      try {
        if (next <= 0) await remove(item.variantId);
        else await update(item.variantId, next);
      } catch (err) {
        Alert.alert("Cart", errMessage(err));
      }
    },
    [update, remove]
  );

  if (!user) {
    return (
      <EmptyState
        title="Sign in to view your cart"
        message="Your cart is saved to your account across devices."
        action={<Button label="Sign in" onPress={() => router.push("/login")} />}
      />
    );
  }

  if (loading && cart.items.length === 0) return <Loading label="Loading cart…" />;

  return (
    <View style={styles.screen}>
      {error ? (
        <View style={styles.errorWrap}>
          <ErrorText message={error} />
        </View>
      ) : null}

      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Your cart is empty"
            message="Browse the shop and add some fresh picks."
            action={<Button label="Start shopping" onPress={() => router.push("/shop")} />}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="leaf-outline" size={22} color={colors.primary} />
              </View>
            )}
            <View style={styles.info}>
              <Text numberOfLines={2} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.variant}>
                {item.label}
                {item.unit ? ` · ${item.unit}` : ""}
              </Text>
              <Text style={styles.price}>{formatINR(item.pricePaise)}</Text>
            </View>
            <View style={styles.right}>
              <QuantityStepper
                quantity={item.quantity}
                onIncrement={() => void changeQty(item, item.quantity + 1)}
                onDecrement={() => void changeQty(item, item.quantity - 1)}
              />
              <Text style={styles.lineTotal}>{formatINR(item.lineTotalPaise)}</Text>
              <Pressable onPress={() => void changeQty(item, 0)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {cart.items.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{formatINR(cart.subtotalPaise)}</Text>
          </View>
          <Text style={styles.footerNote}>
            Delivery fee and taxes are calculated at checkout.
          </Text>
          <Button label="Proceed to checkout" onPress={() => router.push("/checkout")} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  errorWrap: { padding: spacing.md },
  list: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  image: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: "#eef2f7" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  variant: { fontSize: 12, color: colors.muted },
  price: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  right: { alignItems: "flex-end", gap: spacing.xs },
  lineTotal: { fontSize: 14, fontWeight: "700", color: colors.text },
  remove: { fontSize: 12, color: colors.danger },
  footer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between" },
  subtotalLabel: { fontSize: 15, color: colors.muted },
  subtotalValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  footerNote: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
});
