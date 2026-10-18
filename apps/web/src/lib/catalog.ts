import { cache } from "react";
import { prisma, type Prisma } from "database";
import type { ShopQuery } from "./shop-params";

export const PAGE_SIZE = 24;

export type CatalogVariant = {
  id: string;
  pricePaise: number;
  mrpPaise: number | null;
  stockQty: number;
  lowStockThreshold?: number;
};

export type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  images: string[];
  variants: CatalogVariant[];
};

export type CatalogResult = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function emptyResult(page: number): CatalogResult {
  return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 };
}

/** Store settings singleton, or null when the DB is unavailable. */
export const getStoreSettings = cache(async () => {
  try {
    return await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  } catch {
    return null;
  }
});

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
  children: CategoryNode[];
};

/** Active category tree with per-category product counts. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });

    const byId = new Map<string, CategoryNode>();
    for (const c of categories) {
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
        children: [],
      });
    }

    const roots: CategoryNode[] = [];
    for (const c of categories) {
      const node = byId.get(c.id)!;
      const parent = c.parentId ? byId.get(c.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  } catch {
    return [];
  }
});

function findNode(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findNode(node.children, slug);
    if (child) return child;
  }
  return null;
}

export const getCategoryBySlug = cache(async (slug: string): Promise<CategoryNode | null> => {
  const tree = await getCategoryTree();
  return findNode(tree, slug);
});

function flattenIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(flattenIds)];
}

/** Paginated, filtered, sorted catalog of active products. */
export async function getCatalog(query: ShopQuery): Promise<CatalogResult> {
  const page = Math.max(1, query.page || 1);

  let categoryIds: string[] | null = null;
  if (query.category) {
    const node = await getCategoryBySlug(query.category);
    if (!node) return emptyResult(page);
    categoryIds = flattenIds(node);
  }

  const variantFilter: Prisma.ProductVariantWhereInput = { isActive: true };
  if (query.stock) variantFilter.stockQty = { gt: 0 };
  if (query.min != null || query.max != null) {
    const pricePaise: Prisma.IntFilter = {};
    if (query.min != null) pricePaise.gte = query.min * 100;
    if (query.max != null) pricePaise.lte = query.max * 100;
    variantFilter.pricePaise = pricePaise;
  }

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { brand: { contains: query.q, mode: "insensitive" } },
            { tags: { has: query.q } },
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
    switch (query.sort) {
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageIds = sorted
    .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    .map((p) => p.id);

  if (pageIds.length === 0) {
    return { items: [], total, page: safePage, pageSize: PAGE_SIZE, totalPages };
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
  const items: CatalogItem[] = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof full)[number] => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      unit: p.unit,
      images: p.images,
      variants: p.variants,
    }));

  return { items, total, page: safePage, pageSize: PAGE_SIZE, totalPages };
}
