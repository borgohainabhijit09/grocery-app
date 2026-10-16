import { prisma } from "database";
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Track and adjust stock levels across every product variant.
        </p>
      </div>
      <InventoryTable rows={rows} />
    </div>
  );
}
