import { NextResponse } from "next/server";
import { prisma } from "database";
import { storeSettingsSchema } from "shared";
import { parseBody, route } from "@/lib/api-helpers";
import { requireAdminApi } from "@/lib/api-auth";
import { serializeSettings, type SettingsLike } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK: SettingsLike = {
  storeName: "Fresh Grocery",
  tagline: null,
  logoUrl: null,
  contactEmail: null,
  contactPhone: null,
  addressLine: null,
  city: null,
  state: null,
  pincode: null,
  latitude: 0,
  longitude: 0,
  deliveryRadiusKm: 10,
  deliveryFeePaise: 3000,
  freeDeliveryAbovePaise: null,
  minOrderValuePaise: 10000,
  gstEnabled: false,
  gstin: null,
  taxRatePercent: 0,
  acceptingOrders: true,
};

/** Store settings (admin only). */
export const GET = route(async (request) => {
  await requireAdminApi(request);
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings: settings ? serializeSettings(settings) : FALLBACK });
});

/** Upsert store settings (admin only). */
export const PUT = route(async (request) => {
  await requireAdminApi(request);
  const d = await parseBody(storeSettingsSchema, request);

  const data = {
    storeName: d.storeName,
    tagline: d.tagline || null,
    logoUrl: d.logoUrl || null,
    contactEmail: d.contactEmail || null,
    contactPhone: d.contactPhone || null,
    addressLine: d.addressLine || null,
    city: d.city || null,
    state: d.state || null,
    pincode: d.pincode || null,
    latitude: d.latitude,
    longitude: d.longitude,
    deliveryRadiusKm: d.deliveryRadiusKm,
    deliveryFeePaise: d.deliveryFeePaise,
    freeDeliveryAbovePaise: d.freeDeliveryAbovePaise ?? null,
    minOrderValuePaise: d.minOrderValuePaise,
    gstEnabled: d.gstEnabled,
    gstin: d.gstin || null,
    taxRatePercent: d.taxRatePercent,
    acceptingOrders: d.acceptingOrders,
  };

  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json({ settings: serializeSettings(settings) });
});
