import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Button, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { api, type AddressInput } from "@/lib/api";
import { errMessage, firstFieldError } from "@/lib/errors";
import type { Address } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type FormState = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const EMPTY_FORM: FormState = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  isDefault: false,
};

export default function AddressesScreen() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.addresses();
      setAddresses(res.items);
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
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((a: Address) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      latitude: a.latitude ? String(a.latitude) : "",
      longitude: a.longitude ? String(a.longitude) : "",
      isDefault: a.isDefault,
    });
    setFieldErrors({});
    setFormError(null);
    setModalOpen(true);
  }, []);

  const useCurrentLocation = useCallback(async () => {
    setLocating(true);
    setFormError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFormError("Location permission denied. You can enter coordinates manually.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }));
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setLocating(false);
    }
  }, []);

  const save = useCallback(async () => {
    setFormError(null);
    setFieldErrors({});

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!form.latitude || !form.longitude || Number.isNaN(lat) || Number.isNaN(lng)) {
      setFormError("Please capture or enter valid coordinates.");
      return;
    }

    const input: AddressInput = {
      label: form.label.trim() || undefined,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      latitude: lat,
      longitude: lng,
      isDefault: form.isDefault,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.addressUpdate(editingId, input);
      } else {
        await api.addressCreate(input);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(errMessage(err));
      setFieldErrors({
        fullName: firstFieldError(err, "fullName") ?? "",
        phone: firstFieldError(err, "phone") ?? "",
        line1: firstFieldError(err, "line1") ?? "",
        city: firstFieldError(err, "city") ?? "",
        state: firstFieldError(err, "state") ?? "",
        pincode: firstFieldError(err, "pincode") ?? "",
        latitude: firstFieldError(err, "latitude") ?? "",
        longitude: firstFieldError(err, "longitude") ?? "",
      });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, load]);

  const makeDefault = useCallback(
    async (id: string) => {
      try {
        await api.addressSetDefault(id);
        await load();
      } catch (err) {
        Alert.alert("Failed", errMessage(err));
      }
    },
    [load]
  );

  const remove = useCallback(
    (a: Address) => {
      Alert.alert("Delete address", `Remove "${a.label || a.line1}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.addressDelete(a.id);
              await load();
            } catch (err) {
              Alert.alert("Failed", errMessage(err));
            }
          },
        },
      ]);
    },
    [load]
  );

  if (loading) return <Loading label="Loading addresses…" />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorText message={error} /> : null}

        {addresses.length === 0 ? (
          <EmptyState title="No addresses yet" message="Add an address to start ordering." />
        ) : (
          addresses.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {a.label ? `${a.label} · ` : ""}
                  {a.fullName}
                </Text>
                {a.isDefault ? <Text style={styles.defaultTag}>Default</Text> : null}
              </View>
              <Text style={styles.cardText}>{a.phone}</Text>
              <Text style={styles.cardText}>
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
              </Text>
              <Text style={styles.cardText}>
                {a.city}, {a.state} - {a.pincode}
              </Text>
              <View style={styles.latlong}>
                <Text style={styles.coord}>
                  {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.action} onPress={() => openEdit(a)}>
                  <Ionicons name="create-outline" size={18} color={colors.text} />
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                {!a.isDefault ? (
                  <Pressable style={styles.action} onPress={() => void makeDefault(a.id)}>
                    <Ionicons name="star-outline" size={18} color={colors.text} />
                    <Text style={styles.actionText}>Set default</Text>
                  </Pressable>
                ) : null}
                <Pressable style={styles.action} onPress={() => remove(a)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Add new address" onPress={openNew} />
      </View>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit address" : "New address"}</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? <ErrorText message={formError} /> : null}

            <TextField
              label="Label (optional)"
              value={form.label}
              onChangeText={(t) => set("label", t)}
              placeholder="Home, Office…"
            />
            <TextField
              label="Full name"
              value={form.fullName}
              onChangeText={(t) => set("fullName", t)}
              error={fieldErrors.fullName}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChangeText={(t) => set("phone", t)}
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />
            <TextField
              label="Address line 1"
              value={form.line1}
              onChangeText={(t) => set("line1", t)}
              error={fieldErrors.line1}
            />
            <TextField
              label="Address line 2 (optional)"
              value={form.line2}
              onChangeText={(t) => set("line2", t)}
            />
            <TextField
              label="City"
              value={form.city}
              onChangeText={(t) => set("city", t)}
              error={fieldErrors.city}
            />
            <TextField
              label="State"
              value={form.state}
              onChangeText={(t) => set("state", t)}
              error={fieldErrors.state}
            />
            <TextField
              label="Pincode"
              value={form.pincode}
              onChangeText={(t) => set("pincode", t)}
              keyboardType="number-pad"
              error={fieldErrors.pincode}
            />

            <View style={styles.coordRow}>
              <TextField
                label="Latitude"
                value={form.latitude}
                onChangeText={(t) => set("latitude", t)}
                keyboardType="numbers-and-punctuation"
                style={styles.coordField}
              />
              <TextField
                label="Longitude"
                value={form.longitude}
                onChangeText={(t) => set("longitude", t)}
                keyboardType="numbers-and-punctuation"
                style={styles.coordField}
              />
            </View>
            <Button
              label={locating ? "Locating…" : "Use current location"}
              variant="outline"
              onPress={() => void useCurrentLocation()}
              loading={locating}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Set as default address</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => set("isDefault", v)}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <Button
              label={editingId ? "Save changes" : "Add address"}
              onPress={() => void save()}
              loading={saving}
            />
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  defaultTag: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardText: { fontSize: 13, color: colors.muted },
  latlong: { marginTop: 2 },
  coord: { fontSize: 11, color: colors.muted },
  actions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionText: { fontSize: 13, fontWeight: "600", color: colors.text },
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
  coordRow: { flexDirection: "row", gap: spacing.md },
  coordField: { flex: 1 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
});
