import { prisma } from "database";
import { serializeAdminCoupon } from "@/lib/api-admin-serialize";
import { CouponsManager } from "./_components/coupons-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage discount codes for your storefront.
        </p>
      </div>
      <CouponsManager coupons={coupons.map(serializeAdminCoupon)} />
    </div>
  );
}
