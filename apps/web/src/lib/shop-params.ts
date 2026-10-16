export const SHOP_SORTS = ["newest", "price_asc", "price_desc", "name_asc"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SHOP_SORT_LABELS: Record<ShopSort, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name_asc: "Name: A–Z",
};

export type ShopQuery = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  stock?: boolean;
  sort: ShopSort;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Parse Next.js searchParams into a typed shop query. */
export function parseShopQuery(sp: RawParams): ShopQuery {
  const sort = first(sp.sort);
  return {
    q: first(sp.q)?.trim() || undefined,
    category: first(sp.category)?.trim() || undefined,
    min: positiveInt(first(sp.min)),
    max: positiveInt(first(sp.max)),
    stock: ["1", "true", "on"].includes(first(sp.stock) ?? ""),
    sort: (SHOP_SORTS as readonly string[]).includes(sort ?? "") ? (sort as ShopSort) : "newest",
    page: positiveInt(first(sp.page)) ?? 1,
  };
}

/** Build a query string from a shop query, omitting defaults. */
export function buildShopQuery(query: Partial<ShopQuery>, overrides?: Partial<ShopQuery>): string {
  const merged: Partial<ShopQuery> = { ...query, ...overrides };

  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.min) params.set("min", String(merged.min));
  if (merged.max) params.set("max", String(merged.max));
  if (merged.stock) params.set("stock", "1");
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Full href for a base path with the given shop query. */
export function shopHref(
  basePath: string,
  query: Partial<ShopQuery>,
  overrides?: Partial<ShopQuery>
): string {
  return `${basePath}${buildShopQuery(query, overrides)}`;
}

export function countActiveFilters(query: ShopQuery): number {
  let n = 0;
  if (query.q) n++;
  if (query.min != null || query.max != null) n++;
  if (query.stock) n++;
  return n;
}
