import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, EmptyState, ErrorText, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatINR, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import type { AdminCustomer, Address, Order } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.customer(String(id));
      setCustomer(res.customer);
      setAddresses(res.addresses);
      setOrders(res.orders);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading customer…" />;
  if (error || !customer) return <EmptyState title="Customer unavailable" message={error ?? undefined} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.name}>{customer.name}</Text>
        <Text style={styles.muted}>{customer.email}</Text>
        {customer.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
        <View style={styles.badges}>
          <Badge label={customer.role} />
          <Badge
            label={customer.phoneVerified ? "Phone verified" : "Unverified"}
            color={customer.phoneVerified ? colors.primaryDark : colors.warning}
            bg={customer.phoneVerified ? colors.primarySoft : colors.warningSoft}
          />
        </View>
        <Text style={styles.muted}>Joined {formatDate(customer.createdAt)}</Text>
        <View style={styles.statRow}>
          <Stat label="Orders" value={String(customer.orderCount)} />
          <Stat label="Lifetime spend" value={formatINR(customer.spendPaise)} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Addresses ({addresses.length})</Text>
        {addresses.length === 0 ? (
          <Text style={styles.muted}>No addresses on file.</Text>
        ) : (
          addresses.map((a) => (
            <View key={a.id} style={styles.addr}>
              <Text style={styles.text}>
                {a.label ? `${a.label} · ` : ""}
                {a.fullName}
                {a.isDefault ? "  (default)" : ""}
              </Text>
              <Text style={styles.muted}>{a.phone}</Text>
              <Text style={styles.muted}>
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent orders ({orders.length})</Text>
        {orders.length === 0 ? (
          <Text style={styles.muted}>No orders yet.</Text>
        ) : (
          orders.map((o) => (
            <Pressable key={o.id} style={styles.orderRow} onPress={() => router.push(`/orders/${o.id}`)}>
              <View style={styles.orderInfo}>
                <Text style={styles.text}>{o.orderNumber}</Text>
                <Text style={styles.muted}>{formatDateTime(o.placedAt)}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.text}>{formatINR(o.totalPaise)}</Text>
                <Badge
                  label={ORDER_STATUS_LABELS[o.status] ?? o.status}
                  color="#ffffff"
                  bg={ORDER_STATUS_COLORS[o.status] ?? colors.muted}
                />
              </View>
            </Pressable>
          ))
        )}
      </View>

      {error ? <ErrorText message={error} /> : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.xs },
  statRow: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm },
  stat: { gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  addr: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  orderInfo: { flex: 1 },
  orderRight: { alignItems: "flex-end", gap: spacing.xs },
});
