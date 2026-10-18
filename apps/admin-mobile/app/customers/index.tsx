import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { AdminCustomer } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function CustomersScreen() {
  const router = useRouter();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
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
        const res = await api.customers({ q: query.trim() || undefined, page: nextPage });
        setCustomers((prev) => (replace ? res.items : [...prev, ...res.items]));
        setPage(res.page);
        setTotalPages(res.totalPages);
      } catch (err) {
        setError(errMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    void fetchPage(1, true);
  }, [fetchPage]);

  const onSearch = useCallback((text: string) => {
    setSearchInput(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(text), 350);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextField
          value={searchInput}
          onChangeText={onSearch}
          placeholder="Search name, email, phone…"
          autoCapitalize="none"
        />
      </View>

      {error ? (
        <View style={styles.pad}>
          <ErrorText message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Loading customers…" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/customers/${item.id}`)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
              <View style={styles.stats}>
                <Text style={styles.stat}>{item.orderCount} orders</Text>
                <Text style={styles.stat}>{formatINR(item.spendPaise)} spent</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No customers" message="No matches found." />}
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
  header: { padding: spacing.lg },
  pad: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  stats: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xs },
  stat: { fontSize: 12, fontWeight: "600", color: colors.primaryDark },
});
