import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDateTime, formatINR, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PACKED", label: "Packed" },
  { key: "OUT_FOR_DELIVERY", label: "Out" },
  { key: "READY_FOR_PICKUP", label: "Pickup" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [unassigned, setUnassigned] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await api.orders({
          status: status || undefined,
          q: query.trim() || undefined,
          assign: unassigned ? "unassigned" : undefined,
          page: nextPage,
        });
        setOrders((prev) => (replace ? res.items : [...prev, ...res.items]));
        setCounts(res.statusCounts);
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(errMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, query, unassigned]
  );

  useFocusEffect(
    useCallback(() => {
      void fetchPage(1, true);
    }, [fetchPage])
  );

  const onSearch = useCallback((text: string) => {
    setSearchInput(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(text), 350);
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <TextField
          value={searchInput}
          onChangeText={onSearch}
          placeholder="Search order #, name, phone…"
          autoCapitalize="none"
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key || "all"}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              active={status === item.key}
              count={item.key === "" ? total : counts[item.key] ?? 0}
              onPress={() => setStatus(item.key)}
            />
          )}
        />
        <View style={styles.assignRow}>
          <Chip label="Unassigned" active={unassigned} onPress={() => setUnassigned((v) => !v)} />
        </View>
      </View>

      {error ? (
        <View style={styles.pad}>
          <ErrorText message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Loading orders…" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
              <Text style={styles.meta}>
                {item.user?.name ?? "—"} · {formatDateTime(item.placedAt)}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.badgeLine}>
                  {item.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"} ·{" "}
                  {item.paymentMethod} · {item.paymentStatus}
                </Text>
                <Text style={styles.total}>{formatINR(item.totalPaise)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No orders" message="Try a different filter." />}
          ListFooterComponent={
            page < totalPages ? (
              <Button
                label="Load more"
                variant="outline"
                onPress={() => void fetchPage(page + 1, false)}
                loading={loadingMore}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { padding: spacing.lg, gap: spacing.md },
  chipList: { gap: spacing.sm },
  assignRow: { flexDirection: "row" },
  pad: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderNumber: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  badgeLine: { fontSize: 12, color: colors.muted },
  total: { fontSize: 15, fontWeight: "700", color: colors.text },
});
