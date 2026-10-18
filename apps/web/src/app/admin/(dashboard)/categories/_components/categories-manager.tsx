"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/admin/categories";
import type { FormState } from "@/app/actions/admin/_shared";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type FormValues = {
  name: string;
  slug: string;
  image: string;
  parentId: string;
  sortOrder: string;
  isActive: boolean;
};

const empty: FormValues = {
  name: "",
  slug: "",
  image: "",
  parentId: "",
  sortOrder: "0",
  isActive: true,
};

function descendantsOf(id: string, all: CategoryRow[]): Set<string> {
  const out = new Set<string>();
  const walk = (parent: string) => {
    for (const c of all) {
      if (c.parentId === parent && !out.has(c.id)) {
        out.add(c.id);
        walk(c.id);
      }
    }
  };
  walk(id);
  return out;
}

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const parentOptions = useMemo(() => {
    if (!editingId) return categories;
    const blocked = descendantsOf(editingId, categories);
    blocked.add(editingId);
    return categories.filter((c) => !blocked.has(c.id));
  }, [categories, editingId]);

  const nameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const sorted = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          (nameById.get(a.parentId ?? "") ?? "").localeCompare(nameById.get(b.parentId ?? "") ?? "") ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name)
      ),
    [categories, nameById]
  );

  function reset() {
    setEditingId(null);
    setValues(empty);
    setState({});
  }

  function startEdit(row: CategoryRow) {
    setEditingId(row.id);
    setState({});
    setValues({
      name: row.name,
      slug: row.slug,
      image: row.image ?? "",
      parentId: row.parentId ?? "",
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      slug: values.slug || undefined,
      image: values.image,
      parentId: values.parentId || null,
      sortOrder: Number(values.sortOrder) || 0,
      isActive: values.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateCategoryAction(editingId, payload)
        : await createCategoryAction(payload);
      setState(res);
      if (res.ok) reset();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(id);
      setState(res);
      if (res.ok && editingId === id) reset();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Parent</th>
              <th className="px-4 py-2 font-medium">Products</th>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No categories yet. Create your first one.
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">/{row.slug}</div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {row.parentId ? (nameById.get(row.parentId) ?? "—") : "—"}
                </td>
                <td className="px-4 py-2">{row.productCount}</td>
                <td className="px-4 py-2">{row.sortOrder}</td>
                <td className="px-4 py-2">
                  <Badge variant={row.isActive ? "success" : "secondary"}>
                    {row.isActive ? "Active" : "Hidden"}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(row)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(row.id)}
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

      <form onSubmit={submit} className="space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editingId ? "Edit category" : "New category"}</h2>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>

        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
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
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            placeholder="auto-generated from name"
          />
          {state.fieldErrors?.slug && (
            <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent">Parent</Label>
          <select
            id="parent"
            value={values.parentId}
            onChange={(e) => setValues((v) => ({ ...v, parentId: e.target.value }))}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">None (top level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image URL (optional)</Label>
          <Input
            id="image"
            value={values.image}
            onChange={(e) => setValues((v) => ({ ...v, image: e.target.value }))}
            placeholder="https://…"
          />
          {state.fieldErrors?.image && (
            <p className="text-xs text-destructive">{state.fieldErrors.image[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={values.sortOrder}
              onChange={(e) => setValues((v) => ({ ...v, sortOrder: e.target.value }))}
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
              className="size-4"
            />
            Active
          </label>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {pending ? "Saving…" : editingId ? "Save changes" : "Create category"}
        </Button>
      </form>
    </div>
  );
}
