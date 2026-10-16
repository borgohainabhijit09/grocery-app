import Image from "next/image";
import Link from "next/link";
import { prisma } from "database";
import { Button } from "@/components/ui/button";
import { ProductCard, type ProductCardData } from "@/components/product-card";

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const [categories, featured] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        take: 8,
      }),
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { pricePaise: "asc" },
            select: { id: true, pricePaise: true, mrpPaise: true, stockQty: true },
          },
        },
      }),
    ]);
    return { categories, featured: featured as ProductCardData[], dbReady: true };
  } catch {
    return { categories: [], featured: [] as ProductCardData[], dbReady: false };
  }
}

export default async function HomePage() {
  const { categories, featured, dbReady } = await getHomeData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl bg-primary/5 p-8 sm:p-12">
        <p className="text-sm font-medium text-primary">Fresh every day</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Groceries delivered to your door, or ready for pickup.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Choose a delivery slot or collect from the store. Fresh fruits, vegetables, dairy and
          staples at honest prices.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild size="lg">
            <Link href="/shop">Start shopping</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </section>

      {!dbReady && (
        <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Database not reachable yet. Run migrations and seed, then refresh.
        </p>
      )}

      {categories.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group overflow-hidden rounded-xl border bg-card hover:shadow-md"
              >
                <div className="relative aspect-[3/2] bg-secondary">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="p-3 text-sm font-medium">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Featured products</h2>
            <Button asChild variant="link">
              <Link href="/shop">View all</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
