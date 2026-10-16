"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adjustStockAction,
  setStockAction,
  setThresholdAction,
} from "@/app/actions/admin/inventory";

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
};

type Filter = "all" | "low" | "out";

function statusOf(row: InventoryRow): { label: string; variant: "success" | "warning" | "destructive" } {
  if (row.stockQty <= 0) return { label: "Out of stock", variant: "destructive" };
  if (row.stockQty <= row.lowStockThreshold) return { label: "Low stock", variant: "warning" };
  return { label: "In stock", variant: "success" };
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "low" && !(r.stockQty > 0 && r.stockQty <= r.lowStockThreshold)) return false;
      if (filter === "out" && r.stockQty > 0) return false;
      if (!term) return true;
      return (
        r.productName.toLowerCase().includes(term) ||
        r.variantLabel.toLowerCase().includes(term) ||
        (r.sku ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, filter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      low: rows.filter((r) => r.stockQty > 0 && r.stockQty <= r.lowStockThreshold).length,
      out: rows.filter((r) => r.stockQty <= 0).length,
    }),
    [rows]
  );

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Update failed.");
      else router.refresh();
    });
  }

  function commitStock(row: InventoryRow) {
    const raw = drafts[row.variantId];
    if (raw === undefined) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Enter a valid stock quantity.");
      return;
    }
    run(async () => {
      const res = await setStockAction({ variantId: row.variantId, stockQty: qty });
      if (res.ok) setDrafts((d) => {
        const next = { ...d };
        delete next[row.variantId];
        return next;
      });
      return res;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total variants", value: stats.total },
          { label: "Low stock", value: stats.low },
          { label: "Out of stock", value: stats.out },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, variants, SKU…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {(["all", "low", "out"] as Filter[]).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "secondary" : "ghost"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "low" ? "Low" : "Out"}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Low-stock at</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Nothing to show.
                </td>
              </tr>
            )}
            {filtered.map((row) => {
              const status = statusOf(row);
              const draft = drafts[row.variantId];
              const value = draft ?? String(row.stockQty);
              const dirty = draft !== undefined && Number(draft) !== row.stockQty;
              return (
                <tr key={row.variantId} className="border-t">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/products/${row.productId}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.productName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.variantLabel}
                      {!row.isActive && " · hidden"}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{row.sku ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          run(() => adjustStockAction({ variantId: row.variantId, delta: -1 }))
                        }
                        disabled={pending || row.stockQty <= 0}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [row.variantId]: e.target.value }))
                        }
                        onBlur={() => dirty && commitStock(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitStock(row);
                          }
                        }}
                        className="h-8 w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          run(() => adjustStockAction({ variantId: row.variantId, delta: 1 }))
                        }
                        disabled={pending}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      {dirty && (
                        <Button size="sm" onClick={() => commitStock(row)} disabled={pending}>
                          Save
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="0"
                      defaultValue={row.lowStockThreshold}
                      onBlur={(e) => {
                        const t = Number(e.target.value);
                        if (Number.isFinite(t) && t !== row.lowStockThreshold) {
                          run(() =>
                            setThresholdAction({ variantId: row.variantId, lowStockThreshold: t })
                          );
                        }
                      }}
                      className="h-8 w-20 text-center"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
