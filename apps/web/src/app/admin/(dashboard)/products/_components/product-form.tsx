"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toPaise } from "shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/admin/products";
import type { FormState } from "@/app/actions/admin/_shared";

export type VariantRow = {
  id?: string;
  label: string;
  price: string;
  mrp: string;
  stockQty: string;
  sku: string;
};

export type ProductFormData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  unit: string;
  categoryId: string;
  images: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  variants: VariantRow[];
};

type CategoryOption = { id: string; name: string };

function blankVariant(): VariantRow {
  return { label: "", price: "", mrp: "", stockQty: "0", sku: "" };
}

const emptyProduct: ProductFormData = {
  id: "",
  name: "",
  slug: "",
  description: "",
  brand: "",
  unit: "",
  categoryId: "",
  images: [],
  tags: [],
  isActive: true,
  isFeatured: false,
  variants: [blankVariant()],
};

export function ProductForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product?: ProductFormData;
}) {
  const router = useRouter();
  const editing = Boolean(product?.id);
  const [values, setValues] = useState<ProductFormData>(product ?? emptyProduct);
  const [tagsText, setTagsText] = useState((product?.tags ?? []).join(", "));
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setVariant(index: number, patch: Partial<VariantRow>) {
    setValues((v) => ({
      ...v,
      variants: v.variants.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function addVariant() {
    setValues((v) => ({ ...v, variants: [...v.variants, blankVariant()] }));
  }

  function removeVariant(index: number) {
    setValues((v) => ({ ...v, variants: v.variants.filter((_, i) => i !== index) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description,
      categoryId: values.categoryId,
      brand: values.brand,
      unit: values.unit,
      images: values.images,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      variants: values.variants.map((v) => ({
        id: v.id,
        label: v.label,
        pricePaise: toPaise(Number(v.price) || 0),
        mrpPaise: v.mrp ? toPaise(Number(v.mrp)) : null,
        stockQty: Number(v.stockQty) || 0,
        sku: v.sku,
      })),
    };

    startTransition(async () => {
      const res = editing
        ? await updateProductAction(values.id, payload)
        : await createProductAction(payload);
      setState(res);
      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-xl border p-5">
          <div className="space-y-2">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            {state.fieldErrors?.name && (
              <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="auto-generated from name"
            />
            {state.fieldErrors?.slug && (
              <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={values.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={values.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="e.g. 500 g, 1 L"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="organic, fresh, seasonal"
            />
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <ImageUploader value={values.images} onChange={(urls) => set("images", urls)} />
            {state.fieldErrors?.images && (
              <p className="text-xs text-destructive">{state.fieldErrors.images[0]}</p>
            )}
          </div>
        </div>

        <div className="space-y-5 rounded-xl border p-5">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              required
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {state.fieldErrors?.categoryId && (
              <p className="text-xs text-destructive">{state.fieldErrors.categoryId[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="size-4"
            />
            Active (visible in store)
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(e) => set("isFeatured", e.target.checked)}
              className="size-4"
            />
            Featured
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Variants</h2>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="size-4" />
            Add variant
          </Button>
        </div>

        {state.fieldErrors?.variants && (
          <p className="text-xs text-destructive">{state.fieldErrors.variants[0]}</p>
        )}

        <div className="space-y-3">
          {values.variants.map((row, index) => (
            <div
              key={row.id ?? `new-${index}`}
              className="grid grid-cols-2 gap-3 rounded-lg border p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={row.label}
                  onChange={(e) => setVariant(index, { label: e.target.value })}
                  placeholder="500 g"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => setVariant(index, { price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">MRP (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.mrp}
                  onChange={(e) => setVariant(index, { mrp: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={row.stockQty}
                  onChange={(e) => setVariant(index, { stockQty: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input
                  value={row.sku}
                  onChange={(e) => setVariant(index, { sku: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeVariant(index)}
                  disabled={values.variants.length <= 1}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/products">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
