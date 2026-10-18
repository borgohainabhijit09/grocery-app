import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/theme";
import { formatINR } from "@/lib/format";
import type { ProductCard as ProductCardType } from "@/lib/types";

export function ProductCard({
  product,
  onPress,
  onAdd,
}: {
  product: ProductCardType;
  onPress: () => void;
  onAdd: (variantId: string) => void;
}) {
  const variant = product.variants[0];
  const canQuickAdd = product.variants.length === 1 && product.inStock && variant;
  const lowStock =
    !!variant &&
    variant.stockQty > 0 &&
    variant.stockQty <= Math.max(1, variant.lowStockThreshold ?? 5);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
        {product.discountPercent > 0 ? (
          <View style={styles.discount}>
            <Text style={styles.discountText}>{product.discountPercent}% off</Text>
          </View>
        ) : null}
        {lowStock ? (
          <View style={styles.lowStock}>
            <Text style={styles.lowStockText}>Only {variant?.stockQty} left</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.unit}>{product.unit ?? " "}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatINR(product.pricePaise)}</Text>
          {product.mrpPaise && product.mrpPaise > product.pricePaise ? (
            <Text style={styles.mrp}>{formatINR(product.mrpPaise)}</Text>
          ) : null}
        </View>

        {product.inStock && variant ? (
          canQuickAdd ? (
            <Pressable
              style={styles.addBtn}
              onPress={(e) => {
                e.stopPropagation();
                onAdd(variant.id);
              }}
            >
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.selectBtn}
              onPress={(e) => {
                e.stopPropagation();
                onPress();
              }}
            >
              <Text style={styles.selectBtnText}>SELECT</Text>
            </Pressable>
          )
        ) : (
          <View style={styles.outOfStock}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 120, backgroundColor: "#eef2f7" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: colors.muted, fontSize: 12 },
  discount: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  lowStock: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: "#f59e0b",
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowStockText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: spacing.md, gap: spacing.xs },
  name: { fontSize: 14, fontWeight: "600", color: colors.text, minHeight: 36 },
  unit: { fontSize: 12, color: colors.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs },
  price: { fontSize: 15, fontWeight: "700", color: colors.text },
  mrp: { fontSize: 12, color: colors.muted, textDecorationLine: "line-through" },
  addBtn: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: "center",
  },
  addBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  selectBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 7,
    alignItems: "center",
  },
  selectBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  outOfStock: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  outOfStockText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
});
