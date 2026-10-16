import { ProductCard } from "@/components/product-card";
import type { CatalogItem } from "@/lib/catalog";

export function ProductGrid({ items }: { items: CatalogItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="text-4xl">🔍</p>
        <p className="mt-3 font-medium">No products found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
