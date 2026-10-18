import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import type { InventoryRow } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.inventory();
      setItems(res.items);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = useCallback(
    (variantId: string, patch: Partial<InventoryRow>) => {
      setItems((prev) => prev.map((x) => (x.variantId === variantId ? { ...x, ...patch } : x)));
    },
    []
  );

  const adjust = useCallback(
    async (row: InventoryRow, delta: number) => {
      setBusyId(row.variantId);
      try {
        const res = await api.inventoryAdjust(row.variantId, delta);
        updateRow(row.variantId, { stockQty: res.stockQty });
      } catch (err) {
        setError(errMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [updateRow]
  );

  const openEdit = useCallback((row: InventoryRow) => {
    setEditing(row);
    setStock(String(row.stockQty));
    setThreshold(String(row.lowStockThreshold));
    setFormError(null);
  }, []);

  const save = useCallback(async () => {
    if (!editing) return;
    setFormError(null);
    const stockQty = Math.max(0, Math.round(Number(stock) || 0));
    const lowStockThreshold = Math.max(0, Math.round(Number(threshold) || 0));
    setSaving(true);
    try {
      await api.inventorySet(editing.variantId, stockQty);
      await api.inventoryThreshold(editing.variantId, lowStockThreshold);
      updateRow(editing.variantId, { stockQty, lowStockThreshold });
      setEditing(null);
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setSaving(false);
    }
  }, [editing, stock, threshold, updateRow]);

  const visible = useMemo(
    () => (lowOnly ? items.filter((i) => i.stockQty <= i.lowStockThreshold) : items),
    [items, lowOnly]
  );

  if (loading) return <Loading label="Loading inventory…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <Chip
          label={`Low stock only (${items.filter((i) => i.stockQty <= i.lowStockThreshold).length})`}
          active={lowOnly}
          onPress={() => setLowOnly((v) => !v)}
        />
      </View>

      {error ? (
        <View style={styles.pad}>
          <ErrorText message={error} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {visible.length === 0 ? (
          <EmptyState title="Nothing here" message={lowOnly ? "No low-stock variants." : "No variants."} />
        ) : (
          visible.map((row) => {
            const low = row.stockQty <= row.lowStockThreshold;
            return (
              <View key={row.variantId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                      {row.productName}
                    </Text>
                    <Text style={styles.meta}>
                      {row.variantLabel}
                      {row.sku ? ` · ${row.sku}` : ""}
                    </Text>
                  </View>
                  <Badge
                    label={low ? "Low" : "OK"}
                    color={low ? colors.danger : colors.primaryDark}
                    bg={low ? colors.dangerSoft : colors.primarySoft}
                  />
                </View>

                <View style={styles.stockRow}>
                  <Pressable
                    style={styles.step}
                    disabled={busyId === row.variantId}
                    onPress={() => void adjust(row, -1)}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </Pressable>
                  <View style={styles.stockBox}>
                    <Text style={styles.stockValue}>{row.stockQty}</Text>
                    <Text style={styles.stockLabel}>in stock · threshold {row.lowStockThreshold}</Text>
                  </View>
                  <Pressable
                    style={styles.step}
                    disabled={busyId === row.variantId}
                    onPress={() => void adjust(row, 1)}
                  >
                    <Ionicons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>

                <Button size="sm" variant="outline" label="Edit stock" onPress={() => openEdit(row)} />
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{editing?.productName}</Text>
            <Text style={styles.meta}>{editing?.variantLabel}</Text>
            {formError ? <ErrorText message={formError} /> : null}
            <TextField
              label="Stock quantity"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
            <TextField
              label="Low-stock threshold"
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="number-pad"
            />
            <View style={styles.dialogActions}>
              <Button
                label="Cancel"
                variant="outline"
                style={styles.dialogBtn}
                onPress={() => setEditing(null)}
              />
              <Button label="Save" style={styles.dialogBtn} onPress={() => void save()} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { flexDirection: "row", padding: spacing.lg, paddingBottom: 0 },
  pad: { paddingHorizontal: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  stockRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  step: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stockBox: { flex: 1, alignItems: "center" },
  stockValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  stockLabel: { fontSize: 11, color: colors.muted },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  dialogTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  dialogActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  dialogBtn: { flex: 1 },
});
