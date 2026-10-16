"use client";

import { usePathname, useRouter } from "next/navigation";
import { SHOP_SORTS, SHOP_SORT_LABELS, shopHref, type ShopQuery, type ShopSort } from "@/lib/shop-params";

export function SortSelect({ query }: { query: ShopQuery }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort by</span>
      <select
        value={query.sort}
        onChange={(e) =>
          router.push(shopHref(pathname, query, { sort: e.target.value as ShopSort, page: 1 }))
        }
        className="h-9 rounded-md border bg-transparent px-3 text-sm"
      >
        {SHOP_SORTS.map((s) => (
          <option key={s} value={s}>
            {SHOP_SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
