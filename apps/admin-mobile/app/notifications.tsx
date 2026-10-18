import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Switch, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatDateTime, NOTIFICATION_STATUS_COLORS } from "@/lib/format";
import type { NotificationRow } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "QUEUED", label: "Queued" },
  { key: "SENT", label: "Sent" },
  { key: "FAILED", label: "Failed" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_packed: "Order packed",
  order_out_for_delivery: "Out for delivery",
  order_ready_for_pickup: "Ready for pickup",
  order_completed: "Order completed",
  order_cancelled: "Order cancelled",
  order_assigned: "Delivery assigned",
  order_status_changed: "Status updated",
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [includeFailed, setIncludeFailed] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await api.notifications({ status: status || undefined, page: nextPage });
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
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
    [status]
  );

  useEffect(() => {
    void fetchPage(1, true);
  }, [fetchPage]);

  const process = useCallback(async () => {
    setProcessing(true);
    try {
      const res = await api.notificationsProcess(includeFailed);
      Alert.alert("Queue processed", `Scanned ${res.scanned}, sent ${res.sent}, failed ${res.failed}.`);
      await fetchPage(1, true);
    } catch (err) {
      Alert.alert("Processing failed", errMessage(err));
    } finally {
      setProcessing(false);
    }
  }, [includeFailed, fetchPage]);

  const retry = useCallback(
    async (row: NotificationRow) => {
      setRetryingId(row.id);
      try {
        const res = await api.notificationRetry(row.id);
        Alert.alert("Retry complete", `Sent ${res.sent}, failed ${res.failed}.`);
        await fetchPage(1, true);
      } catch (err) {
        Alert.alert("Retry failed", errMessage(err));
      } finally {
        setRetryingId(null);
      }
    },
    [fetchPage]
  );

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
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
        <View style={styles.processRow}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Retry failed</Text>
            <Switch
              value={includeFailed}
              onValueChange={setIncludeFailed}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Button label="Process queue" size="sm" onPress={() => void process()} loading={processing} />
        </View>
      </View>

      {error ? (
        <View style={styles.pad}>
          <ErrorText message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Loading notifications…" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.template}>
                  {TEMPLATE_LABELS[item.template] ?? item.template}
                </Text>
                <Badge
                  label={item.status}
                  color="#ffffff"
                  bg={NOTIFICATION_STATUS_COLORS[item.status] ?? colors.muted}
                />
              </View>
              <Text style={styles.meta}>
                {item.channel}
                {item.orderNumber ? ` · ${item.orderNumber}` : ""}
                {item.recipient ? ` · ${item.recipient}` : ""}
              </Text>
              <Text style={styles.meta}>
                {formatDateTime(item.createdAt)} · attempts {item.attempts}
              </Text>
              {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
              {item.status !== "SENT" ? (
                <Button
                  size="sm"
                  variant="outline"
                  label="Retry"
                  loading={retryingId === item.id}
                  onPress={() => void retry(item)}
                />
              ) : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState title="No notifications" message="The outbox is empty." />}
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
  controls: { padding: spacing.lg, gap: spacing.md },
  chipList: { gap: spacing.sm },
  processRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  switchLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  template: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
});
