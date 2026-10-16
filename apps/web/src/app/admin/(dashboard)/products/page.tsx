import { prisma } from "database";
import { ProductsTable, type ProductRow } from "./_components/products-table";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim();

  const products = await prisma.product.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
            { brand: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: ProductRow[] = products.map((p) => {
    const prices = p.variants.map((v) => v.pricePaise);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: p.images[0] ?? null,
      categoryName: p.category.name,
      variantCount: p.variants.length,
      minPricePaise: prices.length ? Math.min(...prices) : 0,
      maxPricePaise: prices.length ? Math.max(...prices) : 0,
      stock: p.variants.reduce((sum, v) => sum + v.stockQty, 0),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} product{rows.length === 1 ? "" : "s"}
          {term ? ` matching “${term}”` : ""}.
        </p>
      </div>
      <ProductsTable products={rows} query={term ?? ""} />
    </div>
  );
}
