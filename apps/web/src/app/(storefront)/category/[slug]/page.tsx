import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SortSelect } from "@/components/shop/sort-select";
import { ProductGrid } from "@/components/shop/product-grid";
import { Pagination } from "@/components/shop/pagination";
import { ShopFilters } from "@/components/shop/shop-filters";
import { FilterDrawer } from "@/components/shop/filter-drawer";
import { auth } from "@/auth";
import {
  getCatalog,
  getCategoryBySlug,
  getCategoryTree,
  type CatalogResult,
  type CategoryNode,
} from "@/lib/catalog";
import { buildShopQuery, parseShopQuery } from "@/lib/shop-params";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grocery-app.sygmiainnovative.co.in";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category" };

  const title = category.name;
  const description = `Shop fresh ${category.name.toLowerCase()} online. Best prices with fast home delivery in Dibrugarh from Fresh Basket.`;
  const canonical = `${siteUrl}/category/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Fresh Basket`,
      description,
      url: canonical,
      images: category.image ? [{ url: category.image, alt: title }] : [{ url: "/grocery-hero.png", alt: "Fresh Basket" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Fresh Basket`,
      description,
      images: category.image ? [category.image] : ["/grocery-hero.png"],
    },
  };
}

const emptyCatalog: CatalogResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 0,
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const query = parseShopQuery(sp);

  let catalog = emptyCatalog;
  let tree: CategoryNode[] = [];
  try {
    [catalog, tree] = await Promise.all([getCatalog({ ...query, category: slug }), getCategoryTree()]);
  } catch {
    // Render an empty state if the database is unavailable.
  }

  const session = await auth();

  const basePath = `/category/${category.slug}`;
  const childQuery = buildShopQuery(
    { q: query.q, min: query.min, max: query.max, stock: query.stock, sort: query.sort },
    { page: 1 }
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="relative mt-4 overflow-hidden rounded-xl border bg-secondary/30">
        {category.image && (
          <Image
            src={category.image}
            alt={category.name}
            width={1200}
            height={240}
            className="h-40 w-full object-cover sm:h-52"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-background/10" />
        <div className="absolute bottom-0 p-5">
          <h1 className="text-2xl font-semibold sm:text-3xl">{category.name}</h1>
          <p className="text-sm text-muted-foreground">
            {catalog.total} product{catalog.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {category.children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}${childQuery}`}
              className="rounded-full border px-3 py-1 text-sm hover:border-primary hover:bg-primary/5"
            >
              {child.name}
              <span className="ml-1 text-xs text-muted-foreground">{child.productCount}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
          <ShopFilters
            tree={tree}
            query={query}
            basePath={basePath}
            activeCategory={category.slug}
          />
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between gap-3 lg:justify-end">
            <FilterDrawer>
              <ShopFilters
                tree={tree}
                query={query}
                basePath={basePath}
                activeCategory={category.slug}
              />
            </FilterDrawer>
            <SortSelect query={query} />
          </div>
          <ProductGrid items={catalog.items} isLoggedIn={!!session?.user} />
          <Pagination basePath={basePath} query={query} result={catalog} />
        </div>
      </div>
    </div>
  );
}
