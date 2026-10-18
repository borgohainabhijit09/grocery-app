import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Button, EmptyState, ErrorText, Loading } from "@/components/ui";
import { useCart } from "@/context/cart";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDateTime, formatINR, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

const CANCELLABLE = ["PENDING", "CONFIRMED", "PACKED"];

export default function OrderDetailScreen() {
  const router = useRouter();
  const { reorder } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.order(String(id));
      setOrder(res.order);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = useCallback(() => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await api.cancelOrder(String(id));
            await load();
          } catch (err) {
            Alert.alert("Cancel failed", errMessage(err));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }, [id, load]);

  const reorderItems = useCallback(async () => {
    setReordering(true);
    try {
      await reorder(String(id));
      router.push("/cart");
    } catch (err) {
      Alert.alert("Could not reorder", errMessage(err));
    } finally {
      setReordering(false);
    }
  }, [id, reorder, router]);

  if (loading) return <Loading label="Loading order…" />;
  if (error || !order)
    return <EmptyState title="Order unavailable" message={error ?? "Order not found."} />;

  const snapshot = (order.addressSnapshot ?? null) as Record<string, string | null> | null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.placed}>{formatDateTime(order.placedAt)}</Text>
        </View>
        <Badge
          label={ORDER_STATUS_LABELS[order.status] ?? order.status}
          color="#ffffff"
          bg={ORDER_STATUS_COLORS[order.status] ?? colors.muted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{it.productName}</Text>
              <Text style={styles.itemMeta}>
                {it.variantLabel}
                {it.unit ? ` · ${it.unit}` : ""} · Qty {it.quantity} × {formatINR(it.pricePaise)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatINR(it.lineTotalPaise)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <Row label="Subtotal" value={formatINR(order.subtotalPaise)} />
          {order.discountPaise > 0 ? (
            <Row label="Discount" value={`−${formatINR(order.discountPaise)}`} />
          ) : null}
          <Row
            label="Delivery"
            value={order.deliveryFeePaise === 0 ? "Free" : formatINR(order.deliveryFeePaise)}
          />
          {order.taxPaise > 0 ? <Row label="Tax" value={formatINR(order.taxPaise)} /> : null}
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatINR(order.totalPaise)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fulfillment</Text>
        <Text style={styles.text}>
          {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Store pickup"}
        </Text>
        {order.slot ? (
          <Text style={styles.muted}>
            {new Date(order.slot.date).toLocaleDateString("en-IN")} · {order.slot.startTime} –{" "}
            {order.slot.endTime}
          </Text>
        ) : null}
        {order.deliveryPartner ? (
          <Text style={styles.muted}>Delivery partner: {order.deliveryPartner.name}</Text>
        ) : null}
        {snapshot ? (
          <View style={styles.snapshot}>
            <Text style={styles.text}>{snapshot.fullName}</Text>
            <Text style={styles.muted}>{snapshot.phone}</Text>
            <Text style={styles.muted}>
              {snapshot.line1}
              {snapshot.line2 ? `, ${snapshot.line2}` : ""}
            </Text>
            <Text style={styles.muted}>
              {snapshot.city}, {snapshot.state} - {snapshot.pincode}
            </Text>
          </View>
        ) : null}
        {order.notes ? <Text style={styles.muted}>Notes: {order.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Text style={styles.text}>
          {order.paymentMethod} · {order.paymentStatus}
        </Text>
      </View>

      {order.events && order.events.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          {order.events.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <Ionicons name="ellipse" size={8} color={colors.primary} style={styles.eventDot} />
              <View style={styles.eventBody}>
                <Text style={styles.text}>{ORDER_STATUS_LABELS[ev.status] ?? ev.status}</Text>
                {ev.note ? <Text style={styles.muted}>{ev.note}</Text> : null}
              </View>
              <Text style={styles.eventTime}>{formatDateTime(ev.createdAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button label="Buy again" variant="outline" onPress={() => void reorderItems()} loading={reordering} />

      {CANCELLABLE.includes(order.status) ? (
        <Button label="Cancel order" variant="danger" onPress={cancel} loading={cancelling} />
      ) : null}

      {error ? <ErrorText message={error} /> : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontSize: 20, fontWeight: "800", color: colors.text },
  placed: { fontSize: 13, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.muted },
  itemTotal: { fontSize: 14, fontWeight: "600", color: colors.text },
  totals: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  grandLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  grandValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  snapshot: { marginTop: spacing.xs, gap: 2 },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  eventDot: { marginTop: 6 },
  eventBody: { flex: 1 },
  eventTime: { fontSize: 11, color: colors.muted },
});
