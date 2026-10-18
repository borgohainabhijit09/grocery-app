import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Badge, Button, EmptyState, ErrorText, Loading } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDateTime, formatINR, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { reorder } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await api.orders({ pageSize: 50 });
      setOrders(res.items);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const buyAgain = useCallback(
    async (orderId: string) => {
      try {
        await reorder(orderId);
        router.push("/cart");
      } catch (err) {
        Alert.alert("Could not reorder", errMessage(err));
      }
    },
    [reorder, router]
  );

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your orders"
        message="Track deliveries and review past purchases."
        action={<Button label="Sign in" onPress={() => router.push("/login")} />}
      />
    );
  }

  if (loading && orders.length === 0) return <Loading label="Loading orders…" />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={orders}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
      ListHeaderComponent={error ? <ErrorText message={error} /> : null}
      ListEmptyComponent={
        <EmptyState
          title="No orders yet"
          message="Your placed orders will show up here."
          action={<Button label="Start shopping" onPress={() => router.push("/shop")} />}
        />
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
          <View style={styles.cardTop}>
            <Text style={styles.orderNumber}>{item.orderNumber}</Text>
            <Badge
              label={ORDER_STATUS_LABELS[item.status] ?? item.status}
              color="#ffffff"
              bg={ORDER_STATUS_COLORS[item.status] ?? colors.muted}
            />
          </View>
          <Text style={styles.meta}>{formatDateTime(item.placedAt)}</Text>
          <Text style={styles.meta}>
            {item.items.length} item{item.items.length === 1 ? "" : "s"} ·{" "}
            {item.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
          </Text>
          <View style={styles.cardBottom}>
            <Text style={styles.payment}>
              {item.paymentMethod} · {item.paymentStatus}
            </Text>
            <Text style={styles.total}>{formatINR(item.totalPaise)}</Text>
          </View>
          <Pressable
            style={styles.reorder}
            onPress={(e) => {
              e.stopPropagation();
              void buyAgain(item.id);
            }}
          >
            <Text style={styles.reorderText}>Buy again</Text>
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  payment: { fontSize: 12, color: colors.muted },
  total: { fontSize: 16, fontWeight: "800", color: colors.text },
  reorder: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  reorderText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },
});
