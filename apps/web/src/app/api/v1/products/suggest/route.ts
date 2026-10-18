import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchLog = { diff: { q?: string } | null };

/** Aggregate the most frequently searched terms from recent AuditLog entries. */
async function popularTerms(limit = 6): Promise<string[]> {
  try {
    const rows = (await prisma.auditLog.findMany({
      where: { entity: "Search", action: "SEARCH" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { diff: true },
    })) as SearchLog[];

    const counts = new Map<string, number>();
    for (const row of rows) {
      const term = row.diff?.q?.trim().toLowerCase();
      if (!term || term.length < 2) continue;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term]) => term);
  } catch {
    return [];
  }
}

/** Typeahead suggestions for the storefront search box. */
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(10, Math.max(1, Number(sp.get("limit") ?? 6) || 6));

  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], terms: await popularTerms() });
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        variants: { some: { isActive: true } },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      },
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        unit: true,
        images: true,
        variants: {
          where: { isActive: true },
          orderBy: { pricePaise: "asc" },
          select: { pricePaise: true, stockQty: true },
        },
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      take: 4,
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      unit: p.unit,
      image: p.images[0] ?? null,
      pricePaise: p.variants[0]?.pricePaise ?? 0,
      inStock: p.variants.some((v) => v.stockQty > 0),
    })),
    categories,
    terms: [],
  });
});
