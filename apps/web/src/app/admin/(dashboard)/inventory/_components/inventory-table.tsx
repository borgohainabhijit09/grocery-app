"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search } from "lucide-react";

import {
  adjustStockAction,
  bulkSetStockAction,
  setStockAction,
  setThresholdAction,
} from "@/app/actions/admin/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState("");
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

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.variantId));

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast({ title: "Update failed", variant: "error", description: res.error });
      } else {
        if (success) toast({ title: success, variant: "success" });
        router.refresh();
      }
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.variantId)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commitStock(row: InventoryRow) {
    const raw = drafts[row.variantId];
    if (raw === undefined) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      toast({ title: "Enter a valid stock quantity.", variant: "error" });
      return;
    }
    run(async () => {
      const res = await setStockAction({ variantId: row.variantId, stockQty: qty });
      if (res.ok) {
        setDrafts((d) => {
          const next = { ...d };
          delete next[row.variantId];
          return next;
        });
      }
      return res;
    }, "Stock updated");
  }

  function runBulk(mode: "set" | "add") {
    const value = Number(bulkValue);
    if (!Number.isFinite(value)) {
      toast({ title: "Enter a valid number.", variant: "error" });
      return;
    }
    const variantIds = [...selected];
    run(async () => {
      const res = await bulkSetStockAction({ variantIds, mode, value });
      if (res.ok) {
        setSelected(new Set());
        setBulkValue("");
      }
      return res;
    }, `${variantIds.length} variant(s) updated`);
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
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Input
            type="number"
            inputMode="numeric"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder="Quantity"
            className="h-8 w-28"
          />
          <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("set")}>
            Set to
          </Button>
          <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("add")}>
            Add
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Low-stock at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableEmpty colSpan={6}>Nothing to show.</TableEmpty>
          ) : (
            filtered.map((row) => {
              const status = statusOf(row);
              const draft = drafts[row.variantId];
              const value = draft ?? String(row.stockQty);
              const dirty = draft !== undefined && Number(draft) !== row.stockQty;
              return (
                <TableRow key={row.variantId} data-state={selected.has(row.variantId) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(row.variantId)}
                      onCheckedChange={() => toggleOne(row.variantId)}
                      aria-label={`Select ${row.productName}`}
                    />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.sku ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Decrease"
                        onClick={() =>
                          run(() => adjustStockAction({ variantId: row.variantId, delta: -1 }), "Stock updated")
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
                        aria-label="Increase"
                        onClick={() =>
                          run(() => adjustStockAction({ variantId: row.variantId, delta: 1 }), "Stock updated")
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
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      defaultValue={row.lowStockThreshold}
                      onBlur={(e) => {
                        const t = Number(e.target.value);
                        if (Number.isFinite(t) && t !== row.lowStockThreshold) {
                          run(
                            () => setThresholdAction({ variantId: row.variantId, lowStockThreshold: t }),
                            "Threshold updated"
                          );
                        }
                      }}
                      className="h-8 w-20 text-center"
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
