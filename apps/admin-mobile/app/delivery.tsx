import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Badge, Button, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import type { AdminDeliveryPartner } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type FormState = { name: string; email: string; phone: string; password: string };
const EMPTY_FORM: FormState = { name: "", email: "", phone: "", password: "" };

export default function DeliveryScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [partners, setPartners] = useState<AdminDeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.delivery();
      setPartners(res.items);
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

  const toggle = useCallback(
    async (p: AdminDeliveryPartner) => {
      setBusyId(p.id);
      try {
        const res = await api.deliveryToggle(p.id);
        setPartners((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, isActive: res.isActive } : x))
        );
      } catch (err) {
        Alert.alert("Update failed", errMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const create = useCallback(async () => {
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setFormError("Name, email and an 8+ character password are required.");
      return;
    }
    setSaving(true);
    try {
      await api.deliveryCreate({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  if (loading) return <Loading label="Loading delivery partners…" />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorText message={error} /> : null}
        {partners.length === 0 ? (
          <EmptyState title="No delivery partners" message="Add a partner to assign orders." />
        ) : (
          partners.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.info}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>{p.email}</Text>
                  {p.phone ? <Text style={styles.meta}>{p.phone}</Text> : null}
                </View>
                <Badge
                  label={p.isActive ? "Active" : "Inactive"}
                  color={p.isActive ? colors.primaryDark : colors.danger}
                  bg={p.isActive ? colors.primarySoft : colors.dangerSoft}
                />
              </View>
              <Text style={styles.meta}>{p.openOrders} open order{p.openOrders === 1 ? "" : "s"}</Text>
              {isAdmin ? (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active</Text>
                  <Switch
                    value={p.isActive}
                    disabled={busyId === p.id}
                    onValueChange={() => void toggle(p)}
                    trackColor={{ true: colors.primary }}
                  />
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {isAdmin ? (
        <View style={styles.footer}>
          <Button label="New delivery partner" onPress={() => setModalOpen(true)} />
        </View>
      ) : null}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New delivery partner</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? <ErrorText message={formError} /> : null}
            <TextField label="Name" value={form.name} onChangeText={(t) => set("name", t)} />
            <TextField
              label="Email"
              value={form.email}
              onChangeText={(t) => set("email", t)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Phone (optional)"
              value={form.phone}
              onChangeText={(t) => set("phone", t)}
              keyboardType="phone-pad"
            />
            <TextField
              label="Password"
              value={form.password}
              onChangeText={(t) => set("password", t)}
              secureTextEntry
            />
            <Button label="Create partner" onPress={() => void create()} loading={saving} />
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
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
});
