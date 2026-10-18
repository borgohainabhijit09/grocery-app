import { prisma } from "database";

import { PageHeader } from "@/components/admin/page-header";
import { InventoryTable, type InventoryRow } from "./_components/inventory-table";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    include: { product: { select: { id: true, name: true } } },
    orderBy: [{ stockQty: "asc" }, { createdAt: "desc" }],
  });

  const rows: InventoryRow[] = variants.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    productName: v.product.name,
    variantLabel: v.label,
    sku: v.sku,
    stockQty: v.stockQty,
    lowStockThreshold: v.lowStockThreshold,
    isActive: v.isActive,
  }));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track and adjust stock levels across every product variant."
      />
      <InventoryTable rows={rows} />
    </div>
  );
}
