import { SortSelect } from "@/components/shop/sort-select";
import { ProductGrid } from "@/components/shop/product-grid";
import { Pagination } from "@/components/shop/pagination";
import { ShopFilters } from "@/components/shop/shop-filters";
import { FilterDrawer } from "@/components/shop/filter-drawer";
import { auth } from "@/auth";
import { getCatalog, getCategoryTree, type CatalogResult, type CategoryNode } from "@/lib/catalog";
import { parseShopQuery } from "@/lib/shop-params";
import { logSearch } from "@/lib/search-log";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grocery-app.sygmiainnovative.co.in";

export const metadata: Metadata = {
  title: "Shop Groceries",
  description:
    "Browse and buy fresh vegetables, fruits, dairy, staples, snacks and more. Home delivery & store pickup in Dibrugarh.",
  alternates: { canonical: `${siteUrl}/shop` },
  openGraph: {
    title: "Shop Groceries | Fresh Basket",
    description: "Browse and buy fresh groceries online. Home delivery & store pickup in Dibrugarh.",
    url: `${siteUrl}/shop`,
    images: [{ url: `${siteUrl}/grocery-hero.png`, alt: "Fresh Basket Grocery Store" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Groceries | Fresh Basket",
    description: "Browse fresh groceries online — delivery in Dibrugarh.",
    images: [`${siteUrl}/grocery-hero.png`],
  },
};

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
