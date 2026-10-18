import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Button, Chip, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { paiseToRupees, rupeesToPaise } from "@/lib/format";
import type { AdminCategory, ProductInput } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type VariantForm = {
  id?: string;
  label: string;
  price: string;
  mrp: string;
  stock: string;
  sku: string;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  brand: string;
  unit: string;
  categoryId: string;
  images: string[];
  tagsText: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: VariantForm[];
};

const EMPTY_VARIANT: VariantForm = { label: "", price: "", mrp: "", stock: "0", sku: "" };

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  brand: "",
  unit: "",
  categoryId: "",
  images: [""],
  tagsText: "",
  isActive: true,
  isFeatured: false,
  variants: [{ ...EMPTY_VARIANT, label: "Default" }],
};

export default function ProductEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cats = await api.categories();
        if (active) setCategories(cats.items);

        if (!isNew) {
          const { product } = await api.product(String(id));
          if (!active) return;
          setForm({
            name: product.name,
            slug: product.slug,
            description: product.description ?? "",
            brand: product.brand ?? "",
            unit: product.unit ?? "",
            categoryId: product.categoryId,
            images: product.images.length ? product.images : [""],
            tagsText: product.tags.join(", "),
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            variants: product.variants.map((v) => ({
              id: v.id,
              label: v.label,
              price: paiseToRupees(v.pricePaise),
              mrp: v.mrpPaise != null ? paiseToRupees(v.mrpPaise) : "",
              stock: String(v.stockQty),
              sku: v.sku ?? "",
            })),
          });
        }
      } catch (err) {
        if (active) setError(errMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const setImage = useCallback((index: number, value: string) => {
    setForm((f) => ({ ...f, images: f.images.map((img, i) => (i === index ? value : img)) }));
  }, []);

  const addImage = useCallback(() => setForm((f) => ({ ...f, images: [...f.images, ""] })), []);
  const removeImage = useCallback(
    (index: number) =>
      setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) })),
    []
  );

  const setVariant = useCallback(
    <K extends keyof VariantForm>(index: number, key: K, value: VariantForm[K]) => {
      setForm((f) => ({
        ...f,
        variants: f.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
      }));
    },
    []
  );

  const addVariant = useCallback(
    () => setForm((f) => ({ ...f, variants: [...f.variants, { ...EMPTY_VARIANT }] })),
    []
  );
  const removeVariant = useCallback(
    (index: number) =>
      setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) })),
    []
  );

  const save = useCallback(async () => {
    setError(null);
    if (form.name.trim().length < 2) {
      setError("Product name must be at least 2 characters.");
      return;
    }
    if (!form.categoryId) {
      setError("Please choose a category.");
      return;
    }
    if (form.variants.length === 0) {
      setError("Add at least one variant.");
      return;
    }
    for (const v of form.variants) {
      if (!v.label.trim()) {
        setError("Every variant needs a label.");
        return;
      }
      if (!v.price.trim() || Number.isNaN(Number(v.price))) {
        setError(`Enter a valid price for "${v.label}".`);
        return;
      }
    }
    const badImage = form.images.find(
      (img) => img.trim() && !/^https?:\/\//.test(img.trim()) && !img.trim().startsWith("/")
    );
    if (badImage) {
      setError("Image URLs must start with http(s):// or /.");
      return;
    }

    const payload: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      brand: form.brand.trim(),
      unit: form.unit.trim(),
      categoryId: form.categoryId,
      images: form.images.map((s) => s.trim()).filter(Boolean),
      tags: form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      variants: form.variants.map((v) => ({
        id: v.id,
        label: v.label.trim(),
        pricePaise: rupeesToPaise(v.price),
        mrpPaise: v.mrp.trim() ? rupeesToPaise(v.mrp) : null,
        stockQty: Math.max(0, Math.round(Number(v.stock) || 0)),
        sku: v.sku.trim(),
      })),
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.productCreate(payload);
      } else {
        await api.productUpdate(String(id), payload);
      }
      router.back();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, isNew, id, router]);

  const remove = useCallback(() => {
    Alert.alert("Delete product", "This cannot be undone. Delete this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await api.productDelete(String(id));
            router.back();
          } catch (err) {
            setError(errMessage(err));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [id, router]);

  if (loading) return <Loading label="Loading product…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <ErrorText message={error} /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <TextField label="Name" value={form.name} onChangeText={(t) => set("name", t)} />
        <TextField
          label="Slug (optional)"
          value={form.slug}
          onChangeText={(t) => set("slug", t)}
          autoCapitalize="none"
          placeholder="auto-generated from name"
        />
        <TextField label="Brand" value={form.brand} onChangeText={(t) => set("brand", t)} />
        <TextField
          label="Unit"
          value={form.unit}
          onChangeText={(t) => set("unit", t)}
          placeholder="500 g, 1 L, pack of 6"
        />
        <TextField
          label="Description"
          value={form.description}
          onChangeText={(t) => set("description", t)}
          multiline
          inputStyle={styles.multiline}
        />
        <TextField
          label="Tags (comma separated)"
          value={form.tagsText}
          onChangeText={(t) => set("tagsText", t)}
          placeholder="organic, fresh"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Category</Text>
        <View style={styles.wrap}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={form.categoryId === c.id}
              onPress={() => set("categoryId", c.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Images</Text>
          <Pressable onPress={addImage}>
            <Text style={styles.link}>+ Add</Text>
          </Pressable>
        </View>
        {form.images.map((img, i) => (
          <View key={i} style={styles.imageRow}>
            <TextField
              value={img}
              onChangeText={(t) => setImage(i, t)}
              placeholder="https://… or /uploads/x.png"
              autoCapitalize="none"
              style={styles.flex}
            />
            {form.images.length > 1 ? (
              <Pressable hitSlop={8} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Variants</Text>
          <Pressable onPress={addVariant}>
            <Text style={styles.link}>+ Add</Text>
          </Pressable>
        </View>
        {form.variants.map((v, i) => (
          <View key={i} style={styles.variant}>
            <View style={styles.cardHeader}>
              <Text style={styles.variantIndex}>Variant {i + 1}</Text>
              {form.variants.length > 1 ? (
                <Pressable hitSlop={8} onPress={() => removeVariant(i)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
            <TextField
              label="Label"
              value={v.label}
              onChangeText={(t) => setVariant(i, "label", t)}
              placeholder="500 g"
            />
            <View style={styles.twoCol}>
              <TextField
                label="Price (₹)"
                value={v.price}
                onChangeText={(t) => setVariant(i, "price", t)}
                keyboardType="decimal-pad"
                style={styles.flex}
              />
              <TextField
                label="MRP (₹)"
                value={v.mrp}
                onChangeText={(t) => setVariant(i, "mrp", t)}
                keyboardType="decimal-pad"
                style={styles.flex}
              />
            </View>
            <View style={styles.twoCol}>
              <TextField
                label="Stock"
                value={v.stock}
                onChangeText={(t) => setVariant(i, "stock", t)}
                keyboardType="number-pad"
                style={styles.flex}
              />
              <TextField
                label="SKU"
                value={v.sku}
                onChangeText={(t) => setVariant(i, "sku", t)}
                autoCapitalize="characters"
                style={styles.flex}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch
            value={form.isActive}
            onValueChange={(v) => set("isActive", v)}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Featured</Text>
          <Switch
            value={form.isFeatured}
            onValueChange={(v) => set("isFeatured", v)}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <Button label={isNew ? "Create product" : "Save changes"} onPress={() => void save()} loading={saving} />
      {!isNew ? (
        <Button label="Delete product" variant="danger" onPress={remove} loading={deleting} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontWeight: "700" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  flex: { flex: 1 },
  multiline: { minHeight: 80, paddingTop: spacing.sm, textAlignVertical: "top" },
  imageRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  variant: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  variantIndex: { fontSize: 13, fontWeight: "700", color: colors.muted },
  twoCol: { flexDirection: "row", gap: spacing.md },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
});
