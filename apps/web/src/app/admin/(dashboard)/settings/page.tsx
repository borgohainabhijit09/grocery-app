import { prisma } from "database";
import { toRupees } from "shared";
import { requireAdmin } from "@/lib/auth-guard";
import { SettingsForm, type SettingsData } from "./_components/settings-form";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  const s = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });

  const data: SettingsData = {
    storeName: s?.storeName ?? "Fresh Grocery",
    tagline: s?.tagline ?? "",
    logoUrl: s?.logoUrl ?? "",
    contactEmail: s?.contactEmail ?? "",
    contactPhone: s?.contactPhone ?? "",
    addressLine: s?.addressLine ?? "",
    city: s?.city ?? "",
    state: s?.state ?? "",
    pincode: s?.pincode ?? "",
    latitude: String(s?.latitude ?? 0),
    longitude: String(s?.longitude ?? 0),
    deliveryRadiusKm: String(s?.deliveryRadiusKm ?? 10),
    deliveryFee: String(toRupees(s?.deliveryFeePaise ?? 3000)),
    freeDeliveryAbove:
      s?.freeDeliveryAbovePaise != null ? String(toRupees(s.freeDeliveryAbovePaise)) : "",
    minOrderValue: String(toRupees(s?.minOrderValuePaise ?? 10000)),
    gstEnabled: s?.gstEnabled ?? false,
    gstin: s?.gstin ?? "",
    taxRatePercent: String(s?.taxRatePercent ?? 0),
    acceptingOrders: s?.acceptingOrders ?? true,
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your store, delivery area, pricing and taxes.
        </p>
      </div>
      <SettingsForm settings={data} />
    </div>
  );
}
