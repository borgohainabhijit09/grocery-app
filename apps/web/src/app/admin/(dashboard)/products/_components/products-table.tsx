"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { formatINR } from "shared";

import {
  bulkProductAction,
  deleteProductAction,
  toggleProductAction,
  type ProductBulkAction,
} from "@/app/actions/admin/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  categoryName: string;
  variantCount: number;
  minPricePaise: number;
  maxPricePaise: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
};

export function ProductsTable({ products, query }: { products: ProductRow[]; query: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = products.length > 0 && selected.size === products.length;

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    router.push(`/admin/products${params.toString() ? `?${params}` : ""}`);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggle(id: string, field: "isActive" | "isFeatured", value: boolean) {
    startTransition(async () => {
      const res = await toggleProductAction(id, field, value);
      if (res.ok) router.refresh();
      else toast({ title: "Update failed", variant: "error", description: res.error });
    });
  }

  function runBulk(action: ProductBulkAction) {
    const ids = [...selected];
    startTransition(async () => {
      const res = await bulkProductAction(ids, action);
      if (res.ok) {
        toast({ title: `${ids.length} product(s) updated`, variant: "success" });
        setSelected(new Set());
        router.refresh();
      } else {
        toast({ title: "Bulk update failed", variant: "error", description: res.error });
      }
    });
  }

  function runDelete() {
    const ids = deleteIds ?? [];
    if (ids.length === 0) return;
    setSelected(new Set());
    startTransition(async () => {
      const res =
        ids.length === 1 ? await deleteProductAction(ids[0]) : await bulkProductAction(ids, "delete");
      if (res.ok) {
        toast({ title: `${ids.length} product(s) deleted`, variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Delete failed", variant: "error", description: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={runSearch} className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </form>
        <Button asChild variant="outline">
          <a href="/api/admin/products/export" download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            New product
          </Link>
        </Button>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-1">
            <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("activate")}>
              <Eye className="size-3.5" /> Show
            </Button>
            <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("deactivate")}>
              <EyeOff className="size-3.5" /> Hide
            </Button>
            <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("feature")}>
              <Star className="size-3.5" /> Feature
            </Button>
            <Button size="xs" variant="outline" disabled={pending} onClick={() => runBulk("unfeature")}>
              Unfeature
            </Button>
          </div>
          <Button
            size="xs"
            variant="destructive"
            disabled={pending}
            onClick={() => setDeleteIds([...selected])}
          >
            <Trash2 className="size-3.5" /> Delete
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
            <TableHead>Category</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableEmpty colSpan={8}>No products found.</TableEmpty>
          ) : (
            products.map((p) => (
              <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggleOne(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-secondary/30">
                      {p.image && (
                        <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">/{p.slug}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.categoryName}</TableCell>
                <TableCell>{p.variantCount}</TableCell>
                <TableCell>
                  {p.minPricePaise === p.maxPricePaise
                    ? formatINR(p.minPricePaise)
                    : `${formatINR(p.minPricePaise)} – ${formatINR(p.maxPricePaise)}`}
                </TableCell>
                <TableCell>{p.stock}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={p.isActive ? "success" : "secondary"}>
                      {p.isActive ? "Active" : "Hidden"}
                    </Badge>
                    {p.isFeatured && <Badge variant="warning">Featured</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={p.isFeatured ? "Unfeature" : "Feature"}
                      onClick={() => toggle(p.id, "isFeatured", !p.isFeatured)}
                      disabled={pending}
                    >
                      <Star className={p.isFeatured ? "size-4 fill-amber-400 text-amber-400" : "size-4"} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={p.isActive ? "Hide" : "Show"}
                      onClick={() => toggle(p.id, "isActive", !p.isActive)}
                      disabled={pending}
                    >
                      {p.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/products/${p.id}`} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => setDeleteIds([p.id])}
                      disabled={pending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIds(null);
        }}
        title={deleteIds && deleteIds.length > 1 ? `Delete ${deleteIds.length} products?` : "Delete product?"}
        description="This permanently removes the selected products and cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={runDelete}
      />
    </div>
  );
}
