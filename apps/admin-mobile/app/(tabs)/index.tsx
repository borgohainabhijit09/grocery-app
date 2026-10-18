import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, ErrorText, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDateTime, formatINR, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import type { DashboardStats, RecentOrder } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function DashboardScreen() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.stats();
      setStats(res.stats);
      setRecent(res.recentOrders);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) return <Loading label="Loading dashboard…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {error ? <ErrorText message={error} /> : null}

      <View style={styles.grid}>
        <StatCard icon="receipt-outline" label="Orders" value={String(stats?.orders ?? 0)} />
        <StatCard
          icon="time-outline"
          label="Pending"
          value={String(stats?.pending ?? 0)}
          accent={colors.warning}
        />
        <StatCard
          icon="cash-outline"
          label="Revenue"
          value={formatINR(stats?.revenuePaise ?? 0)}
        />
        <StatCard
          icon="alert-circle-outline"
          label="Low stock"
          value={String(stats?.lowStock ?? 0)}
          accent={colors.danger}
        />
        <StatCard icon="pricetags-outline" label="Products" value={String(stats?.products ?? 0)} />
        <StatCard
          icon="albums-outline"
          label="Categories"
          value={String(stats?.categories ?? 0)}
        />
      </View>

      <View style={styles.recentHeader}>
        <Text style={styles.sectionTitle}>Recent orders</Text>
        <Pressable onPress={() => router.push("/orders")}>
          <Text style={styles.link}>View all</Text>
        </Pressable>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.muted}>No orders yet.</Text>
      ) : (
        recent.map((o) => (
          <Pressable key={o.id} style={styles.orderCard} onPress={() => router.push(`/orders/${o.id}`)}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>{o.orderNumber}</Text>
              <Text style={styles.orderMeta}>
                {o.customerName} · {formatDateTime(o.placedAt)}
              </Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>{formatINR(o.totalPaise)}</Text>
              <Badge
                label={ORDER_STATUS_LABELS[o.status] ?? o.status}
                color="#ffffff"
                bg={ORDER_STATUS_COLORS[o.status] ?? colors.muted}
              />
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={accent ?? colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 13, color: colors.muted },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 13 },
  orderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  orderInfo: { flex: 1, gap: 2 },
  orderNumber: { fontSize: 15, fontWeight: "700", color: colors.text },
  orderMeta: { fontSize: 12, color: colors.muted },
  orderRight: { alignItems: "flex-end", gap: spacing.xs },
  orderTotal: { fontSize: 15, fontWeight: "700", color: colors.text },
});
