import { NextResponse } from "next/server";
import { prisma } from "database";
import { haversineKm, isWithinRadius } from "shared";
import { jsonError, route } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK = {
  deliveryFeePaise: 3000,
  freeDeliveryAbovePaise: 50000 as number | null,
  minOrderValuePaise: 10000,
  deliveryRadiusKm: 10,
  latitude: 0,
  longitude: 0,
};

/** Check whether a latitude/longitude falls inside the store's delivery radius. */
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const latitude = Number(sp.get("latitude"));
  const longitude = Number(sp.get("longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return jsonError("latitude and longitude are required.", 422);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return jsonError("Invalid coordinates.", 422);
  }

  const settings = (await prisma.storeSettings.findUnique({ where: { id: "singleton" } })) ?? FALLBACK;
  const hasStoreLocation = settings.latitude !== 0 || settings.longitude !== 0;

  const distanceKm = hasStoreLocation
    ? haversineKm(
        { latitude: settings.latitude, longitude: settings.longitude },
        { latitude, longitude },
      )
    : null;

  const serviceable = hasStoreLocation
    ? isWithinRadius(
        { latitude: settings.latitude, longitude: settings.longitude },
        { latitude, longitude },
        settings.deliveryRadiusKm,
      )
    : true;

  return NextResponse.json({
    serviceable,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
    radiusKm: settings.deliveryRadiusKm,
    deliveryFeePaise: settings.deliveryFeePaise,
    freeDeliveryAbovePaise: settings.freeDeliveryAbovePaise,
    minOrderValuePaise: settings.minOrderValuePaise,
    enforced: hasStoreLocation,
  });
});
