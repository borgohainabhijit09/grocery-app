import { SortSelect } from "@/components/shop/sort-select";
import { ProductGrid } from "@/components/shop/product-grid";
import { Pagination } from "@/components/shop/pagination";
import { ShopFilters } from "@/components/shop/shop-filters";
import { FilterDrawer } from "@/components/shop/filter-drawer";
import { auth } from "@/auth";
import { getCatalog, getCategoryTree, type CatalogResult, type CategoryNode } from "@/lib/catalog";
import { parseShopQuery } from "@/lib/shop-params";
import { logSearch } from "@/lib/search-log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

const emptyCatalog: CatalogResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 0,
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query = parseShopQuery(sp);

  let catalog = emptyCatalog;
  let tree: CategoryNode[] = [];
  try {
    [catalog, tree] = await Promise.all([getCatalog(query), getCategoryTree()]);
  } catch {
    // Render an empty state if the database is unavailable.
  }

  const session = await auth();

  if (query.q) {
    await logSearch(query.q, session?.user?.id ?? null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {query.q ? `Results for “${query.q}”` : "All products"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {catalog.total} product{catalog.total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
          <ShopFilters tree={tree} query={query} basePath="/shop" />
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3 lg:justify-end">
            <FilterDrawer>
              <ShopFilters tree={tree} query={query} basePath="/shop" />
            </FilterDrawer>
            <SortSelect query={query} />
          </div>
          <ProductGrid items={catalog.items} isLoggedIn={!!session?.user} />
          <Pagination basePath="/shop" query={query} result={catalog} />
        </div>
      </div>
    </div>
  );
}
