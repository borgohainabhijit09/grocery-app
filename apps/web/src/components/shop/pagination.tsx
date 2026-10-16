import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shopHref, type ShopQuery } from "@/lib/shop-params";
import type { CatalogResult } from "@/lib/catalog";

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  basePath,
  query,
  result,
}: {
  basePath: string;
  query: ShopQuery;
  result: CatalogResult;
}) {
  const { page, totalPages } = result;
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Button asChild variant="outline" size="sm">
        <Link
          href={shopHref(basePath, query, { page: Math.max(1, page - 1) })}
          aria-disabled={page <= 1}
          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <ChevronLeft className="size-4" />
          Prev
        </Link>
      </Button>

      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            asChild
            variant={p === page ? "default" : "outline"}
            size="icon-sm"
          >
            <Link href={shopHref(basePath, query, { page: p })}>{p}</Link>
          </Button>
        )
      )}

      <Button asChild variant="outline" size="sm">
        <Link
          href={shopHref(basePath, query, { page: Math.min(totalPages, page + 1) })}
          aria-disabled={page >= totalPages}
          className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
        >
          Next
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </nav>
  );
}
