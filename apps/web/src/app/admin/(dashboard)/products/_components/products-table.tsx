"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { formatINR } from "shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteProductAction,
  toggleProductAction,
} from "@/app/actions/admin/products";

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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    router.push(`/admin/products${params.toString() ? `?${params}` : ""}`);
  }

  function toggle(id: string, field: "isActive" | "isFeatured", value: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await toggleProductAction(id, field, value);
      if (!res.ok) setError(res.error ?? "Update failed.");
      else router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (!res.ok) setError(res.error ?? "Delete failed.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={runSearch} className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Variants</th>
              <th className="px-4 py-2 font-medium">Price</th>
              <th className="px-4 py-2 font-medium">Stock</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">
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
                </td>
                <td className="px-4 py-2 text-muted-foreground">{p.categoryName}</td>
                <td className="px-4 py-2">{p.variantCount}</td>
                <td className="px-4 py-2">
                  {p.minPricePaise === p.maxPricePaise
                    ? formatINR(p.minPricePaise)
                    : `${formatINR(p.minPricePaise)} – ${formatINR(p.maxPricePaise)}`}
                </td>
                <td className="px-4 py-2">{p.stock}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={p.isActive ? "success" : "secondary"}>
                      {p.isActive ? "Active" : "Hidden"}
                    </Badge>
                    {p.isFeatured && <Badge variant="warning">Featured</Badge>}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={p.isFeatured ? "Unfeature" : "Feature"}
                      onClick={() => toggle(p.id, "isFeatured", !p.isFeatured)}
                      disabled={pending}
                    >
                      <Star
                        className={`size-4 ${p.isFeatured ? "fill-amber-400 text-amber-400" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(p.id, "isActive", !p.isActive)}
                      disabled={pending}
                    >
                      {p.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/products/${p.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(p.id, p.name)}
                      disabled={pending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
