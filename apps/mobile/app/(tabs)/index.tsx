import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProductCard } from "@/components/product-card";
import { EmptyState, Loading } from "@/components/ui";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { api } from "@/lib/api";
import type { Category, ProductCard as ProductCardType, Settings } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const addToCart = useAddToCart();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<ProductCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, c, f] = await Promise.all([
        api.settings(),
        api.categories(),
        api.products({ featured: true, pageSize: 10 }),
      ]);
      setSettings(s.settings);
      setCategories(c.items.filter((cat) => !cat.parentId));
      setFeatured(f.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the store.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (loading) return <Loading label="Loading store…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{settings?.storeName ?? "Fresh Basket"}</Text>
        <Text style={styles.heroTagline}>
          {settings?.tagline ?? "Daily essentials, delivered fresh."}
        </Text>
        <Pressable style={styles.search} onPress={() => router.push("/shop")}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <Text style={styles.searchText}>Search for products…</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!settings?.acceptingOrders ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>We are not accepting new orders right now.</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={styles.catItem}
            onPress={() => router.push(`/shop?categorySlug=${c.slug}`)}
          >
            {c.image ? (
              <Image source={{ uri: c.image }} style={styles.catImage} />
            ) : (
              <View style={[styles.catImage, styles.catPlaceholder]}>
                <Ionicons name="pricetag-outline" size={22} color={colors.primary} />
              </View>
            )}
            <Text numberOfLines={2} style={styles.catName}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <Pressable onPress={() => router.push("/shop")}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>

      {featured.length === 0 ? (
        <EmptyState
          title="Nothing featured yet"
          message="Browse the shop to see everything we have in stock."
        />
      ) : (
        <View style={styles.grid}>
          {featured.map((p) => (
            <View key={p.id} style={styles.gridItem}>
              <ProductCard
                product={p}
                onPress={() => router.push(`/product/${p.slug}`)}
                onAdd={(variantId) => void addToCart(variantId)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTitle: { fontSize: 26, fontWeight: "800", color: "#ffffff" },
  heroTagline: { fontSize: 14, color: "#dcfce7" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#ffffff",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginTop: spacing.sm,
  },
  searchText: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, padding: spacing.lg },
  notice: {
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { color: colors.warning, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: "600" },
  catRow: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  catItem: { alignItems: "center", width: 76, gap: spacing.xs },
  catImage: { width: 64, height: 64, borderRadius: radius.pill },
  catPlaceholder: {
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { fontSize: 12, textAlign: "center", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md },
  gridItem: { width: "50%", padding: spacing.xs },
});
