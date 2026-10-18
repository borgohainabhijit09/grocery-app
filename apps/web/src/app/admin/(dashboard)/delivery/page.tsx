import { prisma } from "database";
import {
  DeliveryPartnerForm,
  TogglePartnerButton,
} from "@/components/admin/delivery-partner-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delivery partners" };

const OPEN_STATUSES = [
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
] as const;

export default async function AdminDeliveryPartnersPage() {
  const partners = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, isActive: true },
  });

  const openCounts = await prisma.order.groupBy({
    by: ["deliveryPartnerId"],
    where: {
      deliveryPartnerId: { not: null },
      status: { in: [...OPEN_STATUSES] },
    },
    _count: { _all: true },
  });

  const countByPartner = new Map<string, number>();
  for (const c of openCounts) {
    if (c.deliveryPartnerId) countByPartner.set(c.deliveryPartnerId, c._count._all);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Delivery partners</h1>
        <p className="text-sm text-muted-foreground">
          {partners.length} partner{partners.length === 1 ? "" : "s"} ·{" "}
          {partners.filter((p) => p.isActive).length} active
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Active orders</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No delivery partners yet.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-accent/40">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      <div>{p.email}</div>
                      <div className="text-xs">{p.phone ?? "no phone"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {countByPartner.get(p.id) ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TogglePartnerButton userId={p.id} isActive={p.isActive} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add a delivery partner</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryPartnerForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
