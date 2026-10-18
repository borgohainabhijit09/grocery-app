import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Button, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { AdminProductRow } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function ProductsScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.products(query.trim() || undefined);
      setProducts(res.items);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onSearch = useCallback((text: string) => {
    setSearchInput(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(text), 350);
  }, []);

  const toggle = useCallback(
    async (p: AdminProductRow, field: "isActive" | "isFeatured") => {
      const value = field === "isActive" ? !p.isActive : !p.isFeatured;
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, [field]: value } : x))
      );
      try {
        await api.productToggle(p.id, field, value);
      } catch (err) {
        setProducts((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, [field]: !value } : x))
        );
        Alert.alert("Update failed", errMessage(err));
      }
    },
    []
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextField
          value={searchInput}
          onChangeText={onSearch}
          placeholder="Search products…"
          autoCapitalize="none"
          style={styles.search}
        />
        <Button label="New" onPress={() => router.push("/products/new")} style={styles.newBtn} />
      </View>

      {error ? (
        <View style={styles.pad}>
          <ErrorText message={error} />
        </View>
      ) : null}

      {loading ? (
        <Loading label="Loading products…" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/products/${item.id}`)}>
              <View style={styles.cardTop}>
                <View style={styles.titleWrap}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.categoryName} · {item.variantCount} variant
                    {item.variantCount === 1 ? "" : "s"}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => void toggle(item, "isFeatured")}
                  style={styles.star}
                >
                  <Ionicons
                    name={item.isFeatured ? "star" : "star-outline"}
                    size={20}
                    color={item.isFeatured ? colors.warning : colors.muted}
                  />
                </Pressable>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {item.minPricePaise === item.maxPricePaise
                    ? formatINR(item.minPricePaise)
                    : `${formatINR(item.minPricePaise)} – ${formatINR(item.maxPricePaise)}`}
                </Text>
                <Text style={styles.stock}>Stock: {item.stock}</Text>
              </View>

              <View style={styles.actions}>
                <Badge
                  label={item.isActive ? "Active" : "Inactive"}
                  color={item.isActive ? colors.primaryDark : colors.danger}
                  bg={item.isActive ? colors.primarySoft : colors.dangerSoft}
                />
                <Pressable style={styles.toggleBtn} onPress={() => void toggle(item, "isActive")}>
                  <Text style={styles.toggleText}>
                    {item.isActive ? "Deactivate" : "Activate"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No products" message="Add your first product." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  search: { flex: 1 },
  newBtn: { paddingHorizontal: spacing.lg },
  pad: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  titleWrap: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  star: { padding: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 15, fontWeight: "700", color: colors.text },
  stock: { fontSize: 12, color: colors.muted },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  toggleBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  toggleText: { fontSize: 12, fontWeight: "600", color: colors.text },
});
