"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { storeSettingsSchema } from "shared";
import { requireAdmin } from "@/lib/auth-guard";
import { fieldErrorsFrom, toDbError, type FormState } from "./_shared";

export async function updateSettingsAction(input: unknown): Promise<FormState> {
  await requireAdmin();

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const d = parsed.data;

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

  try {
    await prisma.storeSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/cart");
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
