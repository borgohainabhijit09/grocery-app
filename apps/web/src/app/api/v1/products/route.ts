import { NextResponse } from "next/server";
import { prisma, type Prisma } from "database";
import { route } from "@/lib/api-helpers";
import { serializeProductCard } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = ["newest", "price_asc", "price_desc", "name_asc"] as const;
type Sort = (typeof SORTS)[number];

const PAGE_SIZE = 20;

function collectCategoryIds(
  all: { id: string; parentId: string | null }[],
  rootId: string
): string[] {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const next = all.filter((c) => c.parentId && frontier.includes(c.parentId)).map((c) => c.id);
    if (!next.length) break;
    ids.push(...next);
    frontier = next;
  }
  return ids;
}

/** Public product catalog with search, filters, sorting and pagination. */
export const GET = route(async (request) => {
  const sp = new URL(request.url).searchParams;

  const q = sp.get("q")?.trim() || undefined;
  const categoryId = sp.get("categoryId")?.trim() || undefined;
  const categorySlug = sp.get("categorySlug")?.trim() || undefined;
  const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
  const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
  const inStock = ["1", "true", "on"].includes(sp.get("inStock") ?? "");
  const featuredParam = sp.get("featured");
  const featured = featuredParam === null ? undefined : ["1", "true", "on"].includes(featuredParam);
  const sortParam = sp.get("sort");
  const sort: Sort = (SORTS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as Sort)
    : "newest";
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? PAGE_SIZE) || PAGE_SIZE));

  let categoryIds: string[] | null = null;
  if (categoryId) {
    categoryIds = [categoryId];
  } else if (categorySlug) {
    const root = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
    if (!root) return NextResponse.json({ items: [], page, pageSize, total: 0, totalPages: 0 });
    const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
    categoryIds = collectCategoryIds(all, root.id);
  }

  const variantFilter: Prisma.ProductVariantWhereInput = { isActive: true };
  if (inStock) variantFilter.stockQty = { gt: 0 };
  if (minPrice != null || maxPrice != null) {
    const pricePaise: Prisma.IntFilter = {};
    if (minPrice != null && Number.isFinite(minPrice)) pricePaise.gte = minPrice * 100;
    if (maxPrice != null && Number.isFinite(maxPrice)) pricePaise.lte = maxPrice * 100;
    variantFilter.pricePaise = pricePaise;
  }

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(featured !== undefined ? { isFeatured: featured } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : {}),
    variants: { some: variantFilter },
  };

  const minimal = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      createdAt: true,
      variants: {
        where: { isActive: true },
        orderBy: { pricePaise: "asc" },
        select: { pricePaise: true },
      },
    },
  });

  const priceOf = (p: (typeof minimal)[number]) =>
    p.variants[0]?.pricePaise ?? Number.MAX_SAFE_INTEGER;

  const sorted = [...minimal].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return priceOf(a) - priceOf(b);
      case "price_desc":
        return priceOf(b) - priceOf(a);
      case "name_asc":
        return a.name.localeCompare(b.name);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageIds = sorted.slice((safePage - 1) * pageSize, safePage * pageSize).map((p) => p.id);

  if (!pageIds.length) {
    return NextResponse.json({ items: [], page: safePage, pageSize, total, totalPages });
  }

  const full = await prisma.product.findMany({
    where: { id: { in: pageIds } },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { pricePaise: "asc" },
        select: { id: true, pricePaise: true, mrpPaise: true, stockQty: true, lowStockThreshold: true },
      },
    },
  });

  const byId = new Map(full.map((p) => [p.id, p]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof full)[number] => Boolean(p))
    .map(serializeProductCard);

  return NextResponse.json({ items, page: safePage, pageSize, total, totalPages });
});
