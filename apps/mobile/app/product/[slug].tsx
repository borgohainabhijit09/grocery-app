import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { QuantityStepper } from "@/components/quantity-stepper";
import { Button, EmptyState, Loading } from "@/components/ui";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function ProductDetailScreen() {
  const router = useRouter();
  const addToCart = useAddToCart();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [alertSending, setAlertSending] = useState(false);
  const [alertDone, setAlertDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.product(String(slug));
        if (!active) return;
        setProduct(res.product);
        const firstInStock = res.product.variants.find((v) => v.stockQty > 0);
        setVariantId((firstInStock ?? res.product.variants[0])?.id ?? null);
      } catch (err) {
        if (active) setError(errMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const selected = useMemo(
    () => product?.variants.find((v) => v.id === variantId) ?? null,
    [product, variantId]
  );

  async function notifyMe() {
    if (!product || alertSending || alertDone) return;
    try {
      setAlertSending(true);
      await api.stockAlert(product.id, { variantId: selected?.id, productName: product.name });
      setAlertDone(true);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setAlertSending(false);
    }
  }

  if (loading) return <Loading label="Loading product…" />;
  if (error || !product)
    return (
      <EmptyState
        title="Product unavailable"
        message={error ?? "This product could not be found."}
        action={<Button label="Back to shop" variant="outline" onPress={() => router.push("/shop")} />}
      />
    );

  const images = product.images.length ? product.images : [];
  const currentImage = images[imageIndex] ?? images[0];
  const maxQty = Math.max(1, Math.min(99, selected?.stockQty ?? 1));
  const lowStock =
    !!selected &&
    selected.stockQty > 0 &&
    selected.stockQty <= Math.max(1, selected.lowStockThreshold ?? 5);

  async function add() {
    if (!selected || selected.stockQty <= 0) return;
    setAdding(true);
    try {
      await addToCart(selected.id, quantity);
      router.push("/cart");
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {currentImage ? (
          <Image source={{ uri: currentImage }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="leaf-outline" size={48} color={colors.primary} />
          </View>
        )}

        {images.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {images.map((uri, idx) => (
              <Pressable
                key={uri + idx}
                onPress={() => setImageIndex(idx)}
                style={[styles.thumb, idx === imageIndex && styles.thumbActive]}
              >
                <Image source={{ uri }} style={styles.thumbImage} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          <Text style={styles.name}>{product.name}</Text>
          {product.unit ? <Text style={styles.unit}>{product.unit}</Text> : null}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatINR(selected?.pricePaise ?? product.pricePaise)}</Text>
            {selected?.mrpPaise && selected.mrpPaise > selected.pricePaise ? (
              <>
                <Text style={styles.mrp}>{formatINR(selected.mrpPaise)}</Text>
                <Text style={styles.save}>
                  Save {formatINR(selected.mrpPaise - selected.pricePaise)}
                </Text>
              </>
            ) : null}
          </View>

          <Text
            style={[
              styles.stock,
              {
                color:
                  selected && selected.stockQty > 0
                    ? lowStock
                      ? "#b45309"
                      : colors.primaryDark
                    : colors.danger,
              },
            ]}
          >
            {selected
              ? selected.stockQty > 0
                ? lowStock
                  ? `Only ${selected.stockQty} left in stock`
                  : `In stock (${selected.stockQty})`
                : "Out of stock"
              : "Unavailable"}
          </Text>

          {selected && selected.stockQty <= 0 ? (
            <Pressable
              onPress={() => void notifyMe()}
              disabled={alertSending || alertDone}
              style={[styles.notifyBtn, alertDone && styles.notifyBtnDone]}
            >
              <Text style={styles.notifyText}>
                {alertDone
                  ? "You're on the list — we'll notify you"
                  : alertSending
                    ? "Adding…"
                    : "Notify me when back in stock"}
              </Text>
            </Pressable>
          ) : null}

          {product.variants.length > 1 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Choose a pack</Text>
              <View style={styles.variantWrap}>
                {product.variants.map((v) => {
                  const active = v.id === variantId;
                  const disabled = v.stockQty <= 0;
                  return (
                    <Pressable
                      key={v.id}
                      disabled={disabled}
                      onPress={() => {
                        setVariantId(v.id);
                        setQuantity(1);
                      }}
                      style={[
                        styles.variant,
                        active && styles.variantActive,
                        disabled && styles.variantDisabled,
                      ]}
                    >
                      <Text style={[styles.variantLabel, active && styles.variantLabelActive]}>
                        {v.label}
                      </Text>
                      <Text style={[styles.variantPrice, active && styles.variantLabelActive]}>
                        {formatINR(v.pricePaise)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {product.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {product.tags.length ? (
            <View style={styles.tagRow}>
              {product.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <QuantityStepper
          quantity={quantity}
          onIncrement={() => setQuantity((q) => Math.min(maxQty, q + 1))}
          onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={!selected || selected.stockQty <= 0}
        />
        <Button
          label={selected && selected.stockQty > 0 ? "Add to cart" : "Out of stock"}
          onPress={() => void add()}
          loading={adding}
          disabled={!selected || selected.stockQty <= 0}
          style={styles.addBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl },
  hero: { width: "100%", height: 260, backgroundColor: "#eef2f7" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbs: { gap: spacing.sm, padding: spacing.md },
  thumb: {
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  thumbActive: { borderColor: colors.primary },
  thumbImage: { width: 56, height: 56 },
  body: { padding: spacing.lg, gap: spacing.xs },
  brand: { fontSize: 13, color: colors.muted, textTransform: "uppercase" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text },
  unit: { fontSize: 14, color: colors.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.xs },
  price: { fontSize: 24, fontWeight: "800", color: colors.text },
  mrp: { fontSize: 15, color: colors.muted, textDecorationLine: "line-through" },
  save: { fontSize: 13, color: colors.primaryDark, fontWeight: "700" },
  stock: { fontSize: 13, fontWeight: "600", marginTop: spacing.xs },
  notifyBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  notifyBtnDone: { borderColor: colors.primarySoft, backgroundColor: colors.primarySoft },
  notifyText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  variantWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  variant: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 96,
    gap: 2,
  },
  variantActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  variantDisabled: { opacity: 0.45 },
  variantLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  variantLabelActive: { color: colors.primaryDark },
  variantPrice: { fontSize: 12, color: colors.muted },
  description: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  tag: { backgroundColor: "#f1f5f9", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: colors.muted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addBtn: { flex: 1 },
});
