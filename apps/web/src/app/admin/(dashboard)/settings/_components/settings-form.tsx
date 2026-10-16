"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toPaise } from "shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingsAction } from "@/app/actions/admin/settings";
import type { FormState } from "@/app/actions/admin/_shared";

export type SettingsData = {
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

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [values, setValues] = useState(settings);
  const [state, setState] = useState<FormState>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      storeName: values.storeName,
      tagline: values.tagline,
      logoUrl: values.logoUrl,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      addressLine: values.addressLine,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      latitude: Number(values.latitude) || 0,
      longitude: Number(values.longitude) || 0,
      deliveryRadiusKm: Number(values.deliveryRadiusKm) || 0,
      deliveryFeePaise: toPaise(Number(values.deliveryFee) || 0),
      freeDeliveryAbovePaise: values.freeDeliveryAbove
        ? toPaise(Number(values.freeDeliveryAbove))
        : null,
      minOrderValuePaise: toPaise(Number(values.minOrderValue) || 0),
      gstEnabled: values.gstEnabled,
      gstin: values.gstin,
      taxRatePercent: Number(values.taxRatePercent) || 0,
      acceptingOrders: values.acceptingOrders,
    };

    startTransition(async () => {
      const res = await updateSettingsAction(payload);
      setState(res);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </p>
      )}

      <Section title="Store details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" htmlFor="storeName">
            <Input
              id="storeName"
              value={values.storeName}
              onChange={(e) => set("storeName", e.target.value)}
              required
            />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input
              id="tagline"
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
            />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              type="email"
              value={values.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone">
            <Input
              id="contactPhone"
              value={values.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </Field>
          <Field label="Logo URL" htmlFor="logoUrl" className="sm:col-span-2">
            <Input
              id="logoUrl"
              value={values.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
            />
          </Field>
          <Field label="Address" htmlFor="addressLine" className="sm:col-span-2">
            <Input
              id="addressLine"
              value={values.addressLine}
              onChange={(e) => set("addressLine", e.target.value)}
            />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State" htmlFor="state">
            <Input id="state" value={values.state} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label="PIN code" htmlFor="pincode">
            <Input
              id="pincode"
              value={values.pincode}
              onChange={(e) => set("pincode", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Service area">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latitude" htmlFor="latitude">
            <Input
              id="latitude"
              type="number"
              step="any"
              value={values.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </Field>
          <Field label="Longitude" htmlFor="longitude">
            <Input
              id="longitude"
              type="number"
              step="any"
              value={values.longitude}
              onChange={(e) => set("longitude", e.target.value)}
            />
          </Field>
          <Field label="Delivery radius (km)" htmlFor="deliveryRadiusKm">
            <Input
              id="deliveryRadiusKm"
              type="number"
              step="any"
              value={values.deliveryRadiusKm}
              onChange={(e) => set("deliveryRadiusKm", e.target.value)}
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Customers outside this radius from the store location cannot check out.
        </p>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Delivery fee (₹)" htmlFor="deliveryFee">
            <Input
              id="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              value={values.deliveryFee}
              onChange={(e) => set("deliveryFee", e.target.value)}
            />
          </Field>
          <Field label="Free delivery above (₹)" htmlFor="freeDeliveryAbove">
            <Input
              id="freeDeliveryAbove"
              type="number"
              step="0.01"
              min="0"
              value={values.freeDeliveryAbove}
              onChange={(e) => set("freeDeliveryAbove", e.target.value)}
              placeholder="Leave blank to disable"
            />
          </Field>
          <Field label="Minimum order (₹)" htmlFor="minOrderValue">
            <Input
              id="minOrderValue"
              type="number"
              step="0.01"
              min="0"
              value={values.minOrderValue}
              onChange={(e) => set("minOrderValue", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Taxes">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.gstEnabled}
            onChange={(e) => set("gstEnabled", e.target.checked)}
            className="size-4"
          />
          Enable GST on orders
        </label>
        {values.gstEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" htmlFor="gstin">
              <Input id="gstin" value={values.gstin} onChange={(e) => set("gstin", e.target.value)} />
            </Field>
            <Field label="Tax rate (%)" htmlFor="taxRatePercent">
              <Input
                id="taxRatePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={values.taxRatePercent}
                onChange={(e) => set("taxRatePercent", e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Availability">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.acceptingOrders}
            onChange={(e) => set("acceptingOrders", e.target.checked)}
            className="size-4"
          />
          Accepting new orders
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Turn this off to pause checkout (e.g. during holidays).
        </p>
      </Section>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
