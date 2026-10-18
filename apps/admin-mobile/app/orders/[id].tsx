import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import {
  formatDateTime,
  formatINR,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/lib/format";
import type { AdminOrderDetail, DeliveryPartnerOption } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

const TERMINAL = ["CANCELLED", "REFUNDED"];

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [partners, setPartners] = useState<DeliveryPartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.order(String(id));
      setOrder(res.order);
      setPartners(res.partners);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await load();
      } catch (err) {
        Alert.alert("Action failed", errMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const changeStatus = useCallback(
    (status: string) => {
      if (TERMINAL.includes(status)) {
        Alert.alert(
          `${ORDER_STATUS_LABELS[status] ?? status} order`,
          "This will restore stock for the ordered items. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Confirm",
              style: "destructive",
              onPress: () => void run(() => api.orderStatus(String(id), status)),
            },
          ]
        );
        return;
      }
      void run(() => api.orderStatus(String(id), status));
    },
    [id, run]
  );

  const assign = useCallback(
    (partnerId: string | null) => {
      void run(() => api.orderAssign(String(id), partnerId));
    },
    [id, run]
  );

  if (loading) return <Loading label="Loading order…" />;
  if (error && !order) return <EmptyState title="Order unavailable" message={error} />;
  if (!order) return <EmptyState title="Order not found" />;

  const snapshot = (order.addressSnapshot ?? null) as Record<string, unknown> | null;
  const nextStatuses = ORDER_STATUS_FLOW[order.status] ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {error ? <ErrorText message={error} /> : null}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.muted}>{formatDateTime(order.placedAt)}</Text>
        </View>
        <Badge
          label={ORDER_STATUS_LABELS[order.status] ?? order.status}
          color="#ffffff"
          bg={ORDER_STATUS_COLORS[order.status] ?? colors.muted}
        />
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Update status</Text>
        {nextStatuses.length === 0 ? (
          <Text style={styles.muted}>No further transitions available.</Text>
        ) : (
          <View style={styles.actionRow}>
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={TERMINAL.includes(s) ? "danger" : "primary"}
                label={ORDER_STATUS_LABELS[s] ?? s}
                disabled={busy}
                onPress={() => changeStatus(s)}
              />
            ))}
          </View>
        )}

        {order.paymentStatus !== "PAID" ? (
          <Button
            size="sm"
            variant="outline"
            label="Mark as paid"
            disabled={busy}
            onPress={() => void run(() => api.orderPaid(String(id)))}
          />
        ) : null}
      </View>

      {/* Assignment */}
      {order.fulfillmentType === "DELIVERY" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery partner</Text>
          <Text style={styles.muted}>
            {order.deliveryPartner ? `Assigned to ${order.deliveryPartner.name}` : "Unassigned"}
          </Text>
          <View style={styles.actionRow}>
            {partners.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                active={order.deliveryPartnerId === p.id}
                onPress={() => assign(p.id)}
              />
            ))}
          </View>
          {order.deliveryPartnerId ? (
            <Button
              size="sm"
              variant="outline"
              label="Clear assignment"
              disabled={busy}
              onPress={() => assign(null)}
            />
          ) : null}
        </View>
      ) : null}

      {/* Customer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        <Text style={styles.text}>{order.user?.name ?? "—"}</Text>
        <Text style={styles.muted}>{order.user?.email ?? ""}</Text>
        <Text style={styles.muted}>{order.user?.phone ?? ""}</Text>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items</Text>
        {order.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.text}>{it.productName}</Text>
              <Text style={styles.muted}>
                {it.variantLabel} · Qty {it.quantity} × {formatINR(it.pricePaise)}
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

      {/* Fulfillment */}
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
        {order.address ? (
          <View style={styles.addr}>
            <Text style={styles.text}>{order.address.fullName}</Text>
            <Text style={styles.muted}>{order.address.phone}</Text>
            <Text style={styles.muted}>
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city},{" "}
              {order.address.state} - {order.address.pincode}
            </Text>
          </View>
        ) : snapshot ? (
          <Text style={styles.muted}>
            {String(snapshot.line1 ?? "")}, {String(snapshot.city ?? "")}
          </Text>
        ) : null}
        {order.notes ? <Text style={styles.muted}>Notes: {order.notes}</Text> : null}
      </View>

      {/* Payment */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Text style={styles.text}>
          {order.paymentMethod} · {order.paymentStatus}
        </Text>
        {order.payments.map((p) => (
          <View key={p.id} style={styles.payRow}>
            <Text style={styles.muted}>
              {p.provider} · {p.method} · {p.status}
            </Text>
            <Text style={styles.muted}>{formatINR(p.amountPaise)}</Text>
          </View>
        ))}
      </View>

      {/* Timeline */}
      {order.events && order.events.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          {order.events.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={styles.dot} />
              <View style={styles.eventBody}>
                <Text style={styles.text}>{ORDER_STATUS_LABELS[ev.status] ?? ev.status}</Text>
                {ev.note ? <Text style={styles.muted}>{ev.note}</Text> : null}
                {ev.actorName ? <Text style={styles.muted}>by {ev.actorName}</Text> : null}
              </View>
              <Text style={styles.eventTime}>{formatDateTime(ev.createdAt)}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  itemInfo: { flex: 1 },
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
  addr: { gap: 2, marginTop: spacing.xs },
  payRow: { flexDirection: "row", justifyContent: "space-between" },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  eventBody: { flex: 1 },
  eventTime: { fontSize: 11, color: colors.muted },
});
