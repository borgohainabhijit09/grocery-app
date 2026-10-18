import Image from "next/image";
import Link from "next/link";
import { prisma } from "database";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { FestiveCta } from "@/components/home/festive-cta";
import { AppDownload } from "@/components/home/app-download";
import { UspStrip } from "@/components/home/usp-strip";
import { PromoTiles } from "@/components/home/promo-tiles";
import { StoreInfo } from "@/components/home/store-info";

export const dynamic = "force-dynamic";

const variantSelect = {
  where: { isActive: true },
  orderBy: { pricePaise: "asc" as const },
  select: { id: true, pricePaise: true, mrpPaise: true, stockQty: true, lowStockThreshold: true },
};

type GroupedItem = { variantId: string | null; _sum: { quantity: number | null } };

async function getBestSellers(grouped: GroupedItem[]): Promise<ProductCardData[]> {
  const variantIds = grouped
    .map((g) => g.variantId)
    .filter((v): v is string => v !== null);
  if (variantIds.length === 0) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, isActive: true },
    select: { id: true, productId: true },
  });
  const productOf = new Map(variants.map((v) => [v.id, v.productId]));

  const totals = new Map<string, number>();
  for (const g of grouped) {
    const productId = g.variantId ? productOf.get(g.variantId) : undefined;
    if (!productId) continue;
    totals.set(productId, (totals.get(productId) ?? 0) + (g._sum.quantity ?? 0));
  }

  const orderedIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 10);
  if (orderedIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: orderedIds }, isActive: true },
    include: { variants: variantSelect },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return orderedIds.map((id) => byId.get(id)).filter(Boolean) as ProductCardData[];
}

function pickDeals(products: ProductCardData[]): ProductCardData[] {
  return products
    .map((product) => {
      const v = product.variants[0];
      if (!v || !v.mrpPaise || v.mrpPaise <= v.pricePaise || v.stockQty <= 0) return null;
      const pct = Math.round(((v.mrpPaise - v.pricePaise) / v.mrpPaise) * 100);
      return { product, pct };
    })
    .filter((x): x is { product: ProductCardData; pct: number } => x !== null)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)
    .map((x) => x.product);
}

async function getHomeData() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [categories, featured, grouped, dealCandidates, settings, nextPickup] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true, image: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: { variants: variantSelect },
      }),
      prisma.orderItem.groupBy({
        by: ["variantId"],
        where: { variantId: { not: null } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 40,
      }),
      prisma.product.findMany({
        where: { isActive: true, variants: { some: { isActive: true, mrpPaise: { not: null } } } },
        include: { variants: variantSelect },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
      prisma.slot.findFirst({
        where: { isActive: true, fulfillmentType: "PICKUP", date: { gte: startOfToday } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        select: { date: true, startTime: true, endTime: true },
      }),
    ]);

    const bestSellers = await getBestSellers(grouped);
    const deals = pickDeals(dealCandidates as ProductCardData[]);

    return { categories, featured, bestSellers, deals, settings, nextPickup, dbReady: true };
  } catch {
    return {
      categories: [],
      featured: [] as ProductCardData[],
      bestSellers: [] as ProductCardData[],
      deals: [] as ProductCardData[],
      settings: null,
      nextPickup: null,
      dbReady: false,
    };
  }
}

function ProductRail({
  title,
  subtitle,
  products,
  isLoggedIn,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  isLoggedIn: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Button asChild variant="link">
          <Link href="/shop">View all</Link>
        </Button>
      </div>
      <FeaturedCarousel>
        {products.map((p, i) => (
          <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
            <ProductCard product={p} isLoggedIn={isLoggedIn} index={i} />
          </div>
        ))}
      </FeaturedCarousel>
    </section>
  );
}

export default async function HomePage() {
  const [data, session] = await Promise.all([getHomeData(), auth()]);
  const { categories, featured, bestSellers, deals, settings, nextPickup, dbReady } = data;
  const isLoggedIn = !!session?.user;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-900/20 shadow-sm">
        <Image
          src="/grocery-hero.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/80 to-emerald-800/30"
        />
        <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              Fresh groceries, delivered
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Your everyday grocery store, now online
            </h1>
            <p className="mt-4 max-w-lg text-sm text-white/85 sm:text-base">
              Fresh fruits, vegetables, dairy and pantry staples — delivered to your door or ready
              for pickup at your convenience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-emerald-900 hover:bg-white/90">
                <Link href="/shop">Start shopping</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/category/all">Browse categories</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <li>✓ Same-day delivery slots</li>
              <li>✓ Free store pickup</li>
              <li>✓ Honest, everyday prices</li>
            </ul>
          </div>
        </div>
      </section>

      {!dbReady && (
        <p className="mt-8 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          The store is being set up. Please check back shortly.
        </p>
      )}

      {dbReady && <UspStrip freeDeliveryAbovePaise={settings?.freeDeliveryAbovePaise ?? null} />}

      <PromoTiles categories={categories.slice(0, 3)} />

      {categories.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Shop by category</h2>
            <Button asChild variant="link">
              <Link href="/shop">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span className="relative size-16 overflow-hidden rounded-full border bg-secondary shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md sm:size-20">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-2xl">🛒</span>
                  )}
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProductRail
        title="Best sellers"
        subtitle="Loved by your neighbours this week"
        products={bestSellers}
        isLoggedIn={isLoggedIn}
      />

      <ProductRail
        title="Featured products"
        subtitle="Handpicked favourites from our shelves"
        products={featured}
        isLoggedIn={isLoggedIn}
      />

      {deals.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Deals of the day</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Big savings on everyday staples</p>
            </div>
            <Button asChild variant="link">
              <Link href="/shop">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {deals.map((p, i) => (
              <ProductCard key={p.id} product={p} isLoggedIn={isLoggedIn} index={i} />
            ))}
          </div>
        </section>
      )}

      {settings ? (
        <StoreInfo
          name={settings.storeName}
          addressLine={settings.addressLine}
          city={settings.city}
          state={settings.state}
          pincode={settings.pincode}
          phone={settings.contactPhone}
          latitude={settings.latitude}
          longitude={settings.longitude}
          nextPickup={nextPickup}
        />
      ) : null}

      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2">
        <FestiveCta />
        <AppDownload />
      </div>
    </div>
  );
}
