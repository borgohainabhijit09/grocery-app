import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";
import { serializeSettings, type SettingsLike } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK: SettingsLike = {
  storeName: "Fresh Basket",
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
  freeDeliveryAbovePaise: 50000,
  minOrderValuePaise: 10000,
  gstEnabled: false,
  gstin: null,
  taxRatePercent: 0,
  acceptingOrders: true,
};

/** Public store settings (fees, minimums, store info, accepting-orders flag). */
export const GET = route(async () => {
  const settings = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings: settings ? serializeSettings(settings) : FALLBACK });
});
