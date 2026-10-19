import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "database";
import { formatINR, discountPercent, stockState } from "shared";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductActions } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { getStoreSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grocery-app.sygmiainnovative.co.in";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        images: true,
        brand: true,
        category: { select: { name: true } },
        variants: {
          where: { isActive: true },
          orderBy: { pricePaise: "asc" },
          select: { pricePaise: true, mrpPaise: true },
          take: 1,
        },
      },
    });
    if (!product) return { title: "Product Not Found" };

    const title = product.name;
    const description =
      product.description ??
      `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ""} online from Fresh Basket. Fast home delivery in Dibrugarh, Assam.`;
    const image = product.images[0] ?? `${siteUrl}/grocery-hero.png`;
    const canonical = `${siteUrl}/product/${slug}`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | Fresh Basket`,
        description,
        url: canonical,
        type: "website",
        images: [{ url: image, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Fresh Basket`,
        description,
        images: [image],
      },
    };
  } catch {
    return { title: "Product" };
  }
}

async function getProduct(slug: string) {
  try {
    return await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: { where: { isActive: true }, orderBy: { pricePaise: "asc" } },
      },
    });
  } catch {
    return null;
  }
}

async function getRelated(categoryId: string, excludeId: string): Promise<ProductCardData[]> {
  try {
    return (await prisma.product.findMany({
      where: { isActive: true, categoryId, NOT: { id: excludeId } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { pricePaise: "asc" },
          select: { id: true, pricePaise: true, mrpPaise: true, stockQty: true, lowStockThreshold: true },
        },
      },
    })) as ProductCardData[];
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, session, settings] = await Promise.all([
    getProduct(slug),
    auth(),
    getStoreSettings(),
  ]);

  if (!product || !product.isActive) notFound();

  const related = await getRelated(product.categoryId, product.id);

  const price = product.variants[0]?.pricePaise ?? 0;
  const mrp = product.variants[0]?.mrpPaise ?? null;
  const off = mrp ? discountPercent(mrp, price) : 0;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stockQty, 0);
  const inStockVariants = product.variants.filter((v) => v.stockQty > 0);
  const lowStock =
    inStockVariants.length > 0 &&
    inStockVariants.every(
      (v) => stockState(v.stockQty, v.lowStockThreshold ?? undefined) === "low",
    );

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category.name,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: (price / 100).toFixed(2),
      highPrice: (mrp ? mrp / 100 : price / 100).toFixed(2),
      offerCount: product.variants.length,
      availability:
        totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Fresh Basket" },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${siteUrl}/shop` },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${siteUrl}/category/${product.category.slug}`,
      },
      { "@type": "ListItem", position: 3, name: product.name },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav className="text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/category/${product.category.slug}`}
          className="hover:text-foreground"
        >
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.isFeatured && <Badge variant="warning">Featured</Badge>}
            <Badge variant={totalStock > 0 ? (lowStock ? "warning" : "success") : "destructive"}>
              {totalStock > 0 ? (lowStock ? "Low stock" : "In stock") : "Out of stock"}
            </Badge>
          </div>

          <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {product.brand && <span>{product.brand}</span>}
            {product.unit && <span>· {product.unit}</span>}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatINR(price)}</span>
            {mrp && mrp > price && (
              <>
                <span className="text-muted-foreground line-through">{formatINR(mrp)}</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                  {off}% off
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-4 text-sm text-muted-foreground">{product.description}</p>
          )}

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/shop?q=${encodeURIComponent(tag)}`}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6">
            {product.variants.length > 0 ? (
              <ProductActions
                variants={product.variants}
                isLoggedIn={!!session?.user}
                productId={product.id}
                productName={product.name}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Currently unavailable.</p>
            )}
          </div>

          <div className="mt-6 rounded-xl border bg-secondary/20 p-4 text-sm">
            <p className="font-medium">Delivery & pickup</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                Delivery fee {formatINR(settings?.deliveryFeePaise ?? 3000)}
                {settings?.freeDeliveryAbovePaise
                  ? ` · free above ${formatINR(settings.freeDeliveryAbovePaise)}`
                  : ""}
              </li>
              {settings?.minOrderValuePaise ? (
                <li>Minimum order {formatINR(settings.minOrderValuePaise)}</li>
              ) : null}
              <li>Choose a delivery slot or collect in store at checkout.</li>
            </ul>
          </div>

          <Button asChild variant="link" className="mt-4 px-0">
            <Link href={`/category/${product.category.slug}`}>
              More from {product.category.name} →
            </Link>
          </Button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} isLoggedIn={!!session?.user} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
