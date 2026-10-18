import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Badge, Button, Chip, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import type { AdminCategory, CategoryInput } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type FormState = {
  name: string;
  slug: string;
  image: string;
  parentId: string | null;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  image: "",
  parentId: null,
  sortOrder: "0",
  isActive: true,
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.categories();
      setCategories(res.items);
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

  const openEdit = useCallback((c: AdminCategory) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      image: c.image ?? "",
      parentId: c.parentId,
      sortOrder: String(c.sortOrder),
      isActive: c.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const save = useCallback(async () => {
    setFormError(null);
    if (form.name.trim().length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    const payload: CategoryInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      image: form.image.trim() || undefined,
      parentId: form.parentId,
      sortOrder: Math.round(Number(form.sortOrder) || 0),
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editingId) await api.categoryUpdate(editingId, payload);
      else await api.categoryCreate(payload);
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
    Alert.alert("Delete category", "Delete this category?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.categoryDelete(editingId);
            setModalOpen(false);
            await load();
          } catch (err) {
            setFormError(errMessage(err));
          }
        },
      },
    ]);
  }, [editingId, load]);

  if (loading) return <Loading label="Loading categories…" />;

  const parentName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? "—" : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorText message={error} /> : null}
        {categories.length === 0 ? (
          <EmptyState title="No categories" message="Create your first category." />
        ) : (
          categories.map((c) => (
            <Pressable key={c.id} style={styles.card} onPress={() => openEdit(c)}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{c.name}</Text>
                <Badge
                  label={c.isActive ? "Active" : "Inactive"}
                  color={c.isActive ? colors.primaryDark : colors.danger}
                  bg={c.isActive ? colors.primarySoft : colors.dangerSoft}
                />
              </View>
              <Text style={styles.meta}>/{c.slug}</Text>
              <Text style={styles.meta}>
                {c.productCount} product{c.productCount === 1 ? "" : "s"} · {c.childCount} child
                {c.childCount === 1 ? "" : "ren"}
                {parentName(c.parentId) ? ` · under ${parentName(c.parentId)}` : ""}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="New category" onPress={openNew} />
      </View>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit category" : "New category"}</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? <ErrorText message={formError} /> : null}
            <TextField label="Name" value={form.name} onChangeText={(t) => set("name", t)} />
            <TextField
              label="Slug (optional)"
              value={form.slug}
              onChangeText={(t) => set("slug", t)}
              autoCapitalize="none"
            />
            <TextField
              label="Image URL (optional)"
              value={form.image}
              onChangeText={(t) => set("image", t)}
              autoCapitalize="none"
            />
            <TextField
              label="Sort order"
              value={form.sortOrder}
              onChangeText={(t) => set("sortOrder", t)}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Parent category</Text>
            <View style={styles.wrap}>
              <Chip
                label="None"
                active={form.parentId === null}
                onPress={() => set("parentId", null)}
              />
              {categories
                .filter((c) => c.id !== editingId)
                .map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={form.parentId === c.id}
                    onPress={() => set("parentId", c.id)}
                  />
                ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => set("isActive", v)}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <Button label={editingId ? "Save changes" : "Create category"} onPress={() => void save()} loading={saving} />
            {editingId ? (
              <Button label="Delete category" variant="danger" onPress={remove} />
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  meta: { fontSize: 12, color: colors.muted },
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
