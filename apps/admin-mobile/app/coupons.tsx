import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { AdminCoupon, CouponInput, CouponStatus } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type FormState = {
  code: string;
  description: string;
  type: "PERCENT" | "FLAT";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  type: "PERCENT",
  value: "",
  minOrder: "",
  maxDiscount: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const STATUS_META: Record<CouponStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: colors.primaryDark, bg: colors.primarySoft },
  INACTIVE: { label: "Inactive", color: colors.muted, bg: colors.mutedSoft },
  EXPIRED: { label: "Expired", color: colors.danger, bg: colors.dangerSoft },
  SCHEDULED: { label: "Scheduled", color: colors.info, bg: colors.infoSoft },
  EXHAUSTED: { label: "Exhausted", color: colors.warning, bg: colors.warningSoft },
};

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Expired", value: "EXPIRED" },
];

function valueLabel(c: AdminCoupon): string {
  return c.type === "PERCENT" ? `${c.value}% off` : `${formatINR(c.value)} off`;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.coupons();
      setCoupons(res.items);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const openNew = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((c: AdminCoupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: c.type === "PERCENT" ? String(c.value) : String(c.value / 100),
      minOrder: String(c.minOrderPaise / 100),
      maxDiscount: c.maxDiscountPaise != null ? String(c.maxDiscountPaise / 100) : "",
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      startsAt: toDateInput(c.startsAt),
      expiresAt: toDateInput(c.expiresAt),
      isActive: c.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const save = useCallback(async () => {
    setFormError(null);
    const code = form.code.trim().toUpperCase();
    if (code.length < 3) {
      setFormError("Code must be at least 3 characters.");
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setFormError("Use letters, numbers, - and _ only.");
      return;
    }
    const rawValue = Number(form.value);
    const valuePaise =
      form.type === "PERCENT" ? Math.round(rawValue || 0) : Math.round((rawValue || 0) * 100);
    if (!Number.isFinite(rawValue) || valuePaise < 1) {
      setFormError("Enter a valid discount value.");
      return;
    }
    if (form.startsAt && Number.isNaN(Date.parse(form.startsAt))) {
      setFormError("Start date must be YYYY-MM-DD.");
      return;
    }
    if (form.expiresAt && Number.isNaN(Date.parse(form.expiresAt))) {
      setFormError("Expiry date must be YYYY-MM-DD.");
      return;
    }

    const payload: CouponInput = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      type: form.type,
      value:
        form.type === "PERCENT"
          ? Math.round(Number(form.value) || 0)
          : Math.round((Number(form.value) || 0) * 100),
      minOrderPaise: Math.round((Number(form.minOrder) || 0) * 100),
      maxDiscountPaise:
        form.type === "PERCENT" && form.maxDiscount
          ? Math.round((Number(form.maxDiscount) || 0) * 100)
          : null,
      maxUses: form.maxUses ? Math.max(0, Math.round(Number(form.maxUses) || 0)) : null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editingId) await api.couponUpdate(editingId, payload);
      else await api.couponCreate(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, editingId, load]);

  const remove = useCallback(() => {
    if (!editingId) return;
    Alert.alert("Delete coupon", "Delete this coupon?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.couponDelete(editingId);
            setModalOpen(false);
            await load();
          } catch (err) {
            setFormError(errMessage(err));
          }
        },
      },
    ]);
  }, [editingId, load]);

  const toggle = useCallback(
    async (c: AdminCoupon) => {
      try {
        await api.couponToggle(c.id);
        await load();
      } catch (err) {
        setError(errMessage(err));
      }
    },
    [load]
  );

  const visible = coupons.filter((c) => filter === "ALL" || c.status === filter);

  if (loading) return <Loading label="Loading coupons…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorText message={error} /> : null}
        {visible.length === 0 ? (
          <EmptyState title="No coupons" message="Create your first coupon." />
        ) : (
          visible.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.INACTIVE;
            return (
              <View key={c.id} style={styles.card}>
                <Pressable onPress={() => openEdit(c)} style={styles.cardMain}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.code}>{c.code}</Text>
                    <Badge label={meta.label} color={meta.color} bg={meta.bg} />
                  </View>
                  {c.description ? <Text style={styles.meta}>{c.description}</Text> : null}
                  <Text style={styles.strong}>{valueLabel(c)}</Text>
                  <Text style={styles.meta}>
                    {c.minOrderPaise > 0 ? `Min ${formatINR(c.minOrderPaise)} · ` : ""}
                    Used {c.usedCount}
                    {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                    {c.expiresAt ? ` · Ends ${toDateInput(c.expiresAt)}` : " · No expiry"}
                  </Text>
                </Pressable>
                <Pressable onPress={() => void toggle(c)} style={styles.toggleBtn} hitSlop={8}>
                  <Text style={[styles.toggleText, { color: c.isActive ? colors.danger : colors.primary }]}>
                    {c.isActive ? "Deactivate" : "Activate"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="New coupon" onPress={openNew} />
      </View>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit coupon" : "New coupon"}</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? <ErrorText message={formError} /> : null}
            <TextField
              label="Code"
              value={form.code}
              onChangeText={(t) => set("code", t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChangeText={(t) => set("description", t)}
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.wrap}>
              <Chip label="Percent" active={form.type === "PERCENT"} onPress={() => set("type", "PERCENT")} />
              <Chip label="Flat amount" active={form.type === "FLAT"} onPress={() => set("type", "FLAT")} />
            </View>

            <TextField
              label={form.type === "PERCENT" ? "Percent (%)" : "Amount (₹)"}
              value={form.value}
              onChangeText={(t) => set("value", t)}
              keyboardType="decimal-pad"
            />
            <TextField
              label="Min order (₹)"
              value={form.minOrder}
              onChangeText={(t) => set("minOrder", t)}
              keyboardType="decimal-pad"
            />
            {form.type === "PERCENT" ? (
              <TextField
                label="Max discount (₹, optional)"
                value={form.maxDiscount}
                onChangeText={(t) => set("maxDiscount", t)}
                keyboardType="decimal-pad"
              />
            ) : null}
            <TextField
              label="Max uses (optional)"
              value={form.maxUses}
              onChangeText={(t) => set("maxUses", t)}
              keyboardType="number-pad"
            />
            <TextField
              label="Starts (YYYY-MM-DD, optional)"
              value={form.startsAt}
              onChangeText={(t) => set("startsAt", t)}
              placeholder="2026-01-01"
              autoCapitalize="none"
            />
            <TextField
              label="Expires (YYYY-MM-DD, optional)"
              value={form.expiresAt}
              onChangeText={(t) => set("expiresAt", t)}
              placeholder="Leave blank for never"
              autoCapitalize="none"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => set("isActive", v)}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <Button label={editingId ? "Save changes" : "Create coupon"} onPress={() => void save()} loading={saving} />
            {editingId ? <Button label="Delete coupon" variant="danger" onPress={remove} /> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  filters: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardMain: { gap: spacing.xs },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontSize: 16, fontWeight: "800", color: colors.text, letterSpacing: 0.5 },
  meta: { fontSize: 12, color: colors.muted },
  strong: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  toggleBtn: { marginTop: spacing.sm, alignSelf: "flex-start" },
  toggleText: { fontSize: 12, fontWeight: "700" },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
});
