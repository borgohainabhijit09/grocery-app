import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Button, EmptyState, ErrorText, Loading, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { paiseToRupees, rupeesToPaise } from "@/lib/format";
import type { SettingsInput } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

type FormState = {
  storeName: string;
  tagline: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  deliveryRadiusKm: string;
  deliveryFee: string;
  freeDeliveryAbove: string;
  minOrderValue: string;
  gstEnabled: boolean;
  gstin: string;
  taxRatePercent: string;
  acceptingOrders: boolean;
};

const EMPTY_FORM: FormState = {
  storeName: "",
  tagline: "",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "0",
  longitude: "0",
  deliveryRadiusKm: "10",
  deliveryFee: "0",
  freeDeliveryAbove: "",
  minOrderValue: "0",
  gstEnabled: false,
  gstin: "",
  taxRatePercent: "0",
  acceptingOrders: true,
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { settings } = await api.settings();
        if (!active) return;
        setForm({
          storeName: settings.storeName,
          tagline: settings.tagline ?? "",
          logoUrl: settings.logoUrl ?? "",
          contactEmail: settings.contactEmail ?? "",
          contactPhone: settings.contactPhone ?? "",
          addressLine: settings.addressLine ?? "",
          city: settings.city ?? "",
          state: settings.state ?? "",
          pincode: settings.pincode ?? "",
          latitude: String(settings.latitude),
          longitude: String(settings.longitude),
          deliveryRadiusKm: String(settings.deliveryRadiusKm),
          deliveryFee: paiseToRupees(settings.deliveryFeePaise),
          freeDeliveryAbove:
            settings.freeDeliveryAbovePaise != null
              ? paiseToRupees(settings.freeDeliveryAbovePaise)
              : "",
          minOrderValue: paiseToRupees(settings.minOrderValuePaise),
          gstEnabled: settings.gstEnabled,
          gstin: settings.gstin ?? "",
          taxRatePercent: String(settings.taxRatePercent),
          acceptingOrders: settings.acceptingOrders,
        });
      } catch (err) {
        if (active) setError(errMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    setError(null);
    setSaved(false);
    if (form.storeName.trim().length < 2) {
      setError("Store name must be at least 2 characters.");
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }
    const payload: SettingsInput = {
      storeName: form.storeName.trim(),
      tagline: form.tagline.trim(),
      logoUrl: form.logoUrl.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      latitude: lat,
      longitude: lng,
      deliveryRadiusKm: Number(form.deliveryRadiusKm) || 0,
      deliveryFeePaise: rupeesToPaise(form.deliveryFee),
      freeDeliveryAbovePaise: form.freeDeliveryAbove.trim()
        ? rupeesToPaise(form.freeDeliveryAbove)
        : null,
      minOrderValuePaise: rupeesToPaise(form.minOrderValue),
      gstEnabled: form.gstEnabled,
      gstin: form.gstin.trim(),
      taxRatePercent: Number(form.taxRatePercent) || 0,
      acceptingOrders: form.acceptingOrders,
    };
    setSaving(true);
    try {
      await api.settingsUpdate(payload);
      setSaved(true);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  }, [form]);

  if (!isAdmin) {
    return <EmptyState title="Admin only" message="Store settings can be managed by admins." />;
  }
  if (loading) return <Loading label="Loading settings…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <ErrorText message={error} /> : null}
      {saved ? (
        <View style={styles.savedBox}>
          <Text style={styles.savedText}>Settings saved.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Store</Text>
        <TextField label="Store name" value={form.storeName} onChangeText={(t) => set("storeName", t)} />
        <TextField label="Tagline" value={form.tagline} onChangeText={(t) => set("tagline", t)} />
        <TextField label="Logo URL" value={form.logoUrl} onChangeText={(t) => set("logoUrl", t)} autoCapitalize="none" />
        <TextField label="Contact email" value={form.contactEmail} onChangeText={(t) => set("contactEmail", t)} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Contact phone" value={form.contactPhone} onChangeText={(t) => set("contactPhone", t)} keyboardType="phone-pad" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Address & location</Text>
        <TextField label="Address line" value={form.addressLine} onChangeText={(t) => set("addressLine", t)} />
        <TextField label="City" value={form.city} onChangeText={(t) => set("city", t)} />
        <TextField label="State" value={form.state} onChangeText={(t) => set("state", t)} />
        <TextField label="Pincode" value={form.pincode} onChangeText={(t) => set("pincode", t)} keyboardType="number-pad" />
        <View style={styles.twoCol}>
          <TextField label="Latitude" value={form.latitude} onChangeText={(t) => set("latitude", t)} keyboardType="numbers-and-punctuation" style={styles.flex} />
          <TextField label="Longitude" value={form.longitude} onChangeText={(t) => set("longitude", t)} keyboardType="numbers-and-punctuation" style={styles.flex} />
        </View>
        <TextField
          label="Delivery radius (km)"
          value={form.deliveryRadiusKm}
          onChangeText={(t) => set("deliveryRadiusKm", t)}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pricing</Text>
        <TextField label="Delivery fee (₹)" value={form.deliveryFee} onChangeText={(t) => set("deliveryFee", t)} keyboardType="decimal-pad" />
        <TextField
          label="Free delivery above (₹, optional)"
          value={form.freeDeliveryAbove}
          onChangeText={(t) => set("freeDeliveryAbove", t)}
          keyboardType="decimal-pad"
        />
        <TextField label="Minimum order value (₹)" value={form.minOrderValue} onChangeText={(t) => set("minOrderValue", t)} keyboardType="decimal-pad" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tax (GST)</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>GST enabled</Text>
          <Switch value={form.gstEnabled} onValueChange={(v) => set("gstEnabled", v)} trackColor={{ true: colors.primary }} />
        </View>
        <TextField label="GSTIN" value={form.gstin} onChangeText={(t) => set("gstin", t)} autoCapitalize="characters" />
        <TextField
          label="Tax rate (%)"
          value={form.taxRatePercent}
          onChangeText={(t) => set("taxRatePercent", t)}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Accepting orders</Text>
          <Switch
            value={form.acceptingOrders}
            onValueChange={(v) => set("acceptingOrders", v)}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <Button label="Save settings" onPress={() => void save()} loading={saving} />
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
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  twoCol: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  savedBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  savedText: { color: colors.primaryDark, fontWeight: "600" },
});
