import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, ErrorText, Loading, TextField } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { useCart } from "@/context/cart";
import { api } from "@/lib/api";
import { errMessage } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import type { Address, FulfillmentType, PublicCoupon, Settings, Slot } from "@/lib/types";
import { colors, radius, spacing } from "@/theme";

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearLocal } = useCart();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("DELIVERY");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [s, a, c] = await Promise.all([
          api.settings(),
          api.addresses(),
          api.coupons().catch(() => ({ items: [] as PublicCoupon[] })),
        ]);
        if (!active) return;
        setSettings(s.settings);
        setAddresses(a.items);
        setCoupons(c.items);
        setAddressId(a.items.find((x) => x.isDefault)?.id ?? a.items[0]?.id ?? null);
      } catch (err) {
        if (active) setError(errMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    setSlotId(null);
    (async () => {
      try {
        const res = await api.slots({ fulfillmentType });
        if (active) setSlots(res.items);
      } catch (err) {
        if (active) setError(errMessage(err));
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fulfillmentType]);

  const groupedSlots = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = s.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [slots]);

  const pricing = useMemo(() => {
    const subtotal = cart.subtotalPaise;
    const deliveryFee =
      fulfillmentType === "DELIVERY" && settings
        ? settings.freeDeliveryAbovePaise != null && subtotal >= settings.freeDeliveryAbovePaise
          ? 0
          : settings.deliveryFeePaise
        : 0;
    const taxable = Math.max(0, subtotal - couponDiscount);
    const tax = settings?.gstEnabled ? Math.round((taxable * settings.taxRatePercent) / 100) : 0;
    return { subtotal, deliveryFee, tax, total: taxable + deliveryFee + tax };
  }, [cart.subtotalPaise, couponDiscount, fulfillmentType, settings]);

  const applyCoupon = useCallback(
    async (override?: string) => {
      const code = (override ?? couponCode).trim().toUpperCase();
      if (!code) return;
      if (override) setCouponCode(code);
      setApplying(true);
      setCouponMessage(null);
      try {
        const res = await api.validateCoupon(code, cart.subtotalPaise);
        if (res.valid) {
          setCouponDiscount(res.discountPaise);
          setCouponMessage(`Applied ${code} · −${formatINR(res.discountPaise)}`);
        } else {
          setCouponDiscount(0);
          setCouponMessage(res.error);
        }
      } catch (err) {
        setCouponDiscount(0);
        setCouponMessage(errMessage(err));
      } finally {
        setApplying(false);
      }
    },
    [couponCode, cart.subtotalPaise]
  );

  const placeOrder = useCallback(async () => {
    setError(null);
    if (fulfillmentType === "DELIVERY" && !addressId) {
      setError("Please add a delivery address.");
      return;
    }
    if (!slotId) {
      setError("Please choose a time slot.");
      return;
    }
    setPlacing(true);
    try {
      const res = await api.placeOrder({
        fulfillmentType,
        addressId: fulfillmentType === "DELIVERY" ? addressId ?? undefined : undefined,
        slotId,
        paymentMethod: "COD",
        couponCode: couponCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      clearLocal();
      router.replace(`/orders/${res.order.id}`);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setPlacing(false);
    }
  }, [fulfillmentType, addressId, slotId, couponCode, notes, clearLocal, router]);

  if (loading) return <Loading label="Preparing checkout…" />;

  if (cart.items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Button label="Start shopping" onPress={() => router.push("/shop")} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorText message={error} /> : null}

        <Text style={styles.sectionTitle}>How would you like to receive your order?</Text>
        <View style={styles.toggleRow}>
          {(["DELIVERY", "PICKUP"] as FulfillmentType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFulfillmentType(t)}
              style={[styles.toggle, fulfillmentType === t && styles.toggleActive]}
            >
              <Ionicons
                name={t === "DELIVERY" ? "bicycle-outline" : "storefront-outline"}
                size={18}
                color={fulfillmentType === t ? colors.primaryDark : colors.muted}
              />
              <Text
                style={[styles.toggleText, fulfillmentType === t && styles.toggleTextActive]}
              >
                {t === "DELIVERY" ? "Delivery" : "Store pickup"}
              </Text>
            </Pressable>
          ))}
        </View>

        {fulfillmentType === "DELIVERY" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery address</Text>
              <Pressable onPress={() => router.push("/addresses")}>
                <Text style={styles.link}>Manage</Text>
              </Pressable>
            </View>
            {addresses.length === 0 ? (
              <Pressable style={styles.addAddress} onPress={() => router.push("/addresses")}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addAddressText}>Add a delivery address</Text>
              </Pressable>
            ) : (
              addresses.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setAddressId(a.id)}
                  style={[styles.addressCard, addressId === a.id && styles.addressCardActive]}
                >
                  <Ionicons
                    name={addressId === a.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={addressId === a.id ? colors.primary : colors.muted}
                  />
                  <View style={styles.addressBody}>
                    <Text style={styles.addressName}>
                      {a.fullName}
                      {a.label ? ` · ${a.label}` : ""}
                    </Text>
                    <Text style={styles.addressText}>
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
                    </Text>
                    <Text style={styles.addressText}>{a.phone}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time slot</Text>
          {loadingSlots ? (
            <Text style={styles.muted}>Loading slots…</Text>
          ) : groupedSlots.length === 0 ? (
            <Text style={styles.muted}>No slots available right now.</Text>
          ) : (
            groupedSlots.map(([date, list]) => (
              <View key={date} style={styles.slotGroup}>
                <Text style={styles.slotDate}>
                  {new Date(date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
                <View style={styles.slotWrap}>
                  {list.map((s) => {
                    const disabled = s.available <= 0;
                    const active = slotId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        disabled={disabled}
                        onPress={() => setSlotId(s.id)}
                        style={[
                          styles.slot,
                          active && styles.slotActive,
                          disabled && styles.slotDisabled,
                        ]}
                      >
                        <Text style={[styles.slotText, active && styles.slotTextActive]}>
                          {s.startTime} – {s.endTime}
                        </Text>
                        {disabled ? <Text style={styles.slotFull}>Full</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.payRow}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={styles.payText}>Cash on delivery / Pay at pickup</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coupon (optional)</Text>
          {coupons.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.couponChips}
            >
              {coupons.map((c) => {
                const eligible = cart.subtotalPaise >= c.minOrderPaise;
                const active = couponCode.trim().toUpperCase() === c.code;
                return (
                  <Pressable
                    key={c.code}
                    disabled={!eligible || applying}
                    onPress={() => void applyCoupon(c.code)}
                    style={[
                      styles.couponChip,
                      active && styles.couponChipActive,
                      !eligible && styles.couponChipDisabled,
                    ]}
                  >
                    <Text style={[styles.couponChipValue, active && styles.couponChipTextActive]}>
                      {c.type === "PERCENT" ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`}
                    </Text>
                    <Text style={styles.couponChipCode}>{c.code}</Text>
                    <Text style={styles.couponChipMeta}>
                      {eligible
                        ? c.minOrderPaise > 0
                          ? `Min ${formatINR(c.minOrderPaise)}`
                          : "No minimum"
                        : `Min ${formatINR(c.minOrderPaise)}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <View style={styles.couponRow}>
            <TextField
              value={couponCode}
              onChangeText={(t) => setCouponCode(t.toUpperCase())}
              placeholder="Enter code"
              autoCapitalize="characters"
              style={styles.couponField}
            />
            <Button
              label="Apply"
              variant="outline"
              size="sm"
              onPress={() => void applyCoupon()}
              loading={applying}
            />
          </View>
          {couponMessage ? <Text style={styles.couponMsg}>{couponMessage}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order notes (optional)</Text>
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Delivery instructions…"
            multiline
            inputStyle={styles.notes}
          />
        </View>

        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={formatINR(pricing.subtotal)} />
          {couponDiscount > 0 ? (
            <SummaryRow label="Discount" value={`−${formatINR(couponDiscount)}`} />
          ) : null}
          {fulfillmentType === "DELIVERY" ? (
            <SummaryRow
              label="Delivery fee"
              value={pricing.deliveryFee === 0 ? "Free" : formatINR(pricing.deliveryFee)}
            />
          ) : null}
          {settings?.gstEnabled ? <SummaryRow label="Tax" value={formatINR(pricing.tax)} /> : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatINR(pricing.total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Place order" onPress={() => void placeOrder()} loading={placing} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontWeight: "600" },
  muted: { color: colors.muted, fontSize: 13 },
  toggleRow: { flexDirection: "row", gap: spacing.md },
  toggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  toggleActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  toggleTextActive: { color: colors.primaryDark },
  addAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  addAddressText: { color: colors.primary, fontWeight: "600" },
  addressCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  addressCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressBody: { flex: 1, gap: 2 },
  addressName: { fontSize: 14, fontWeight: "700", color: colors.text },
  addressText: { fontSize: 13, color: colors.muted },
  slotGroup: { gap: spacing.sm, marginTop: spacing.sm },
  slotDate: { fontSize: 13, fontWeight: "700", color: colors.muted },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  slotActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  slotDisabled: { opacity: 0.5 },
  slotText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  slotTextActive: { color: colors.primaryDark },
  slotFull: { fontSize: 11, color: colors.danger },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  payText: { fontSize: 14, fontWeight: "600", color: colors.primaryDark },
  couponRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  couponChips: { gap: spacing.sm, paddingVertical: 2 },
  couponChip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    minWidth: 120,
  },
  couponChipActive: { backgroundColor: colors.primarySoft, borderStyle: "solid" },
  couponChipDisabled: { borderColor: colors.border, opacity: 0.5 },
  couponChipValue: { fontSize: 14, fontWeight: "800", color: colors.text },
  couponChipTextActive: { color: colors.primaryDark },
  couponChipCode: { fontSize: 12, fontWeight: "700", color: colors.primaryDark, letterSpacing: 0.5 },
  couponChipMeta: { fontSize: 11, color: colors.muted },
  couponField: { flex: 1 },
  couponMsg: { fontSize: 13, color: colors.info },
  notes: { minHeight: 72, textAlignVertical: "top", paddingTop: spacing.sm },
  summary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: colors.muted, fontSize: 14 },
  summaryValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: colors.text },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
