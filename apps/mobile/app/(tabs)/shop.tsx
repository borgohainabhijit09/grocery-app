import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ProductCard } from "@/components/product-card";
import { SideDrawer } from "@/components/side-drawer";
import { Button, EmptyState } from "@/components/ui";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { api, type ProductQuery } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import type { Category, ProductCard as ProductCardType } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

const SORTS: { key: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
  { key: "name_asc", label: "A–Z" },
];

const PAGE_SIZE = 20;

export default function ShopScreen() {
  const router = useRouter();
  const addToCart = useAddToCart();
  const params = useLocalSearchParams<{ q?: string; categorySlug?: string }>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(params.q ?? "");
  const [categorySlug, setCategorySlug] = useState<string | undefined>(params.categorySlug);
  const [sort, setSort] = useState<NonNullable<ProductQuery["sort"]>>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [items, setItems] = useState<ProductCardType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggest, setSuggest] = useState<{
    products: { id: string; name: string; slug: string; unit: string | null }[];
    terms: string[];
  }>({ products: [], terms: [] });
  const [showSuggest, setShowSuggest] = useState(false);

  const requestId = useRef(0);
  const activeFilterCount =
    (categorySlug ? 1 : 0) + (sort !== "newest" ? 1 : 0) + (inStockOnly ? 1 : 0);

  function resetFilters() {
    setCategorySlug(undefined);
    setSort("newest");
    setInStockOnly(false);
  }

  useEffect(() => {
    api
      .categories()
      .then((res) => setCategories(res.items.filter((c) => !c.parentId)))
      .catch(() => undefined);
  }, []);

  // Debounce the free-text search.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const baseQuery = useMemo<ProductQuery>(
    () => ({
      q: debouncedQuery.trim() || undefined,
      categorySlug,
      sort,
      inStock: inStockOnly || undefined,
    }),
    [debouncedQuery, categorySlug, sort, inStockOnly]
  );

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await api.products({ ...baseQuery, page: nextPage, pageSize: PAGE_SIZE });
        if (id !== requestId.current) return;
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } catch (err) {
        if (id === requestId.current) setError(errMessage(err));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [baseQuery]
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSuggest({ products: [], terms: [] });
      return;
    }
    const timer = setTimeout(() => {
      api
        .suggest(term)
        .then((res) =>
          setSuggest({
            products: res.products.slice(0, 5),
            terms: res.terms.filter((t) => t.toLowerCase() !== term.toLowerCase()).slice(0, 5),
          })
        )
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const hasSuggestions = suggest.products.length > 0 || suggest.terms.length > 0;

  function chooseSuggestion(term: string) {
    setQuery(term);
    setSuggest({ products: [], terms: [] });
  }

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && page < totalPages) {
      void fetchPage(page + 1, true);
    }
  }, [loading, loadingMore, page, totalPages, fetchPage]);

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        style={styles.screen}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.column}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <View style={styles.search}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                  placeholder="Search products…"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable
                style={styles.filterButton}
                onPress={() => setFiltersOpen(true)}
                accessibilityLabel="Open filters"
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color={activeFilterCount > 0 ? colors.primary : colors.text}
                />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {showSuggest && hasSuggestions ? (
              <View style={styles.suggestPanel}>
                {suggest.terms.length > 0 ? (
                  <View style={styles.suggestRow}>
                    <Ionicons name="trending-up" size={15} color={colors.muted} />
                    {suggest.terms.map((t) => (
                      <Pressable key={t} onPress={() => chooseSuggestion(t)} style={styles.suggestChip}>
                        <Text style={styles.suggestChipText}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {suggest.products.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setShowSuggest(false);
                      router.push(`/product/${p.slug}`);
                    }}
                    style={styles.suggestItem}
                  >
                    <Ionicons name="search" size={15} color={colors.muted} />
                    <Text numberOfLines={1} style={styles.suggestItemText}>
                      {p.name}
                      {p.unit ? <Text style={styles.suggestItemUnit}> · {p.unit}</Text> : null}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!loading ? (
              <Text style={styles.resultCount}>
                {total} product{total === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.slug}`)}
              onAdd={(variantId) => void addToCart(variantId)}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : error ? (
            <EmptyState title="Something went wrong" message={error} />
          ) : (
            <EmptyState title="No products found" message="Try a different search or filter." />
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null
        }
      />

      <SideDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        side="left"
        footer={
          <View style={styles.drawerFooter}>
            <Button
              label="Reset"
              variant="outline"
              onPress={resetFilters}
              style={styles.footerButton}
            />
            <Button
              label="Show results"
              onPress={() => setFiltersOpen(false)}
              style={styles.footerButton}
            />
          </View>
        }
      >
        <ScrollView contentContainerStyle={styles.drawerContent}>
          <View style={styles.drawerSection}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipWrap}>
              <Chip
                label="All"
                active={!categorySlug}
                onPress={() => setCategorySlug(undefined)}
              />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={categorySlug === c.slug}
                  onPress={() => setCategorySlug(c.slug)}
                />
              ))}
            </View>
          </View>

          <View style={styles.drawerSection}>
            <Text style={styles.sectionTitle}>Sort by</Text>
            <View style={styles.chipWrap}>
              {SORTS.map((s) => (
                <Chip
                  key={s.key}
                  label={s.label}
                  active={sort === s.key}
                  onPress={() => setSort(s.key)}
                />
              ))}
            </View>
          </View>

          <View style={styles.drawerSection}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Pressable
              style={[styles.stockToggle, inStockOnly && styles.stockToggleActive]}
              onPress={() => setInStockOnly((v) => !v)}
            >
              <Ionicons
                name={inStockOnly ? "checkbox" : "square-outline"}
                size={18}
                color={inStockOnly ? colors.primary : colors.muted}
              />
              <Text style={styles.stockToggleText}>Show in-stock items only</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SideDrawer>
    </>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  column: { paddingHorizontal: spacing.sm },
  header: { padding: spacing.md, gap: spacing.md },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  stockToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stockToggleActive: {},
  stockToggleText: { fontSize: 14, color: colors.text },
  resultCount: { fontSize: 13, color: colors.muted },
  suggestPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  suggestChipText: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
  suggestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestItemText: { flex: 1, fontSize: 14, color: colors.text },
  suggestItemUnit: { color: colors.muted },
  gridItem: { width: "50%", padding: spacing.xs },
  loader: { marginVertical: spacing.xl },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  drawerContent: { padding: spacing.lg },
  drawerSection: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  drawerFooter: { flexDirection: "row", gap: spacing.md },
  footerButton: { flex: 1 },
});
