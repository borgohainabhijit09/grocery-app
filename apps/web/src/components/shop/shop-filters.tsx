import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildShopQuery, type ShopQuery } from "@/lib/shop-params";
import type { CategoryNode } from "@/lib/catalog";

function filterQuery(query: ShopQuery): Partial<ShopQuery> {
  return { q: query.q, min: query.min, max: query.max, stock: query.stock, sort: query.sort };
}

function CategoryLink({
  node,
  active,
  query,
}: {
  node: CategoryNode;
  active: boolean;
  query: ShopQuery;
}) {
  const qs = buildShopQuery(filterQuery(query), { category: undefined, page: 1 });
  return (
    <li>
      <Link
        href={`/category/${node.slug}${qs}`}
        className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
          active ? "bg-primary/10 font-medium text-primary" : "hover:bg-accent"
        }`}
      >
        <span>{node.name}</span>
        <span className="text-xs text-muted-foreground">{node.productCount}</span>
      </Link>
      {node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 pl-3">
          {node.children.map((child) => (
            <CategoryLink key={child.id} node={child} active={false} query={query} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ShopFilters({
  tree,
  query,
  basePath,
  activeCategory,
}: {
  tree: CategoryNode[];
  query: ShopQuery;
  basePath: string;
  activeCategory?: string;
}) {
  const allQs = buildShopQuery(filterQuery(query), { category: undefined, page: 1 });

  return (
    <div className="space-y-6">
      <form method="get" action={basePath} className="space-y-6">
        {query.category && <input type="hidden" name="category" value={query.category} />}
        <input type="hidden" name="sort" value={query.sort} />

        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={query.q ?? ""} placeholder="Search products…" />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Categories</p>
          <ul className="space-y-0.5">
            <li>
              <Link
                href={`/shop${allQs}`}
                className={`flex items-center rounded-md px-2 py-1.5 text-sm ${
                  !activeCategory ? "bg-primary/10 font-medium text-primary" : "hover:bg-accent"
                }`}
              >
                All products
              </Link>
            </li>
            {tree.map((node) => (
              <CategoryLink
                key={node.id}
                node={node}
                active={node.slug === activeCategory}
                query={query}
              />
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Price (₹)</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              name="min"
              min="0"
              defaultValue={query.min ?? ""}
              placeholder="Min"
              className="h-9"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              name="max"
              min="0"
              defaultValue={query.max ?? ""}
              placeholder="Max"
              className="h-9"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="stock"
            value="1"
            defaultChecked={query.stock}
            className="size-4"
          />
          In stock only
        </label>

        <div className="flex gap-2">
          <Button type="submit" size="sm" className="flex-1">
            Apply
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>Reset</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
