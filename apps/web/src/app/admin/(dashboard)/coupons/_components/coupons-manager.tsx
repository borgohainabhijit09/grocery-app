"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { formatINR } from "shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponAction,
  updateCouponAction,
} from "@/app/actions/admin/coupons";
import type { FormState } from "@/app/actions/admin/_shared";

export type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
};

type FormValues = {
  code: string;
  description: string;
  type: "PERCENT" | "FLAT";
  value: string;
  minOrder: string;
  maxDiscount: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const empty: FormValues = {
  code: "",
  description: "",
  type: "PERCENT",
  value: "",
  minOrder: "",
  maxDiscount: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "default" | "outline"> = {
  ACTIVE: "success",
  SCHEDULED: "default",
  EXPIRED: "secondary",
  EXHAUSTED: "warning",
  INACTIVE: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  EXPIRED: "Expired",
  EXHAUSTED: "Used up",
  INACTIVE: "Inactive",
};

function paiseToRupees(paise: number): string {
  return String(paise / 100);
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function valueLabel(row: CouponRow): string {
  return row.type === "PERCENT" ? `${row.value}%` : formatINR(row.value);
}

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function reset() {
    setEditingId(null);
    setValues(empty);
    setState({});
  }

  function startEdit(row: CouponRow) {
    setEditingId(row.id);
    setState({});
    setValues({
      code: row.code,
      description: row.description ?? "",
      type: row.type === "FLAT" ? "FLAT" : "PERCENT",
      value: row.type === "PERCENT" ? String(row.value) : paiseToRupees(row.value),
      minOrder: paiseToRupees(row.minOrderPaise),
      maxDiscount: row.maxDiscountPaise != null ? paiseToRupees(row.maxDiscountPaise) : "",
      maxUses: row.maxUses != null ? String(row.maxUses) : "",
      startsAt: toLocalInput(row.startsAt),
      expiresAt: toLocalInput(row.expiresAt),
      isActive: row.isActive,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      code: values.code,
      description: values.description,
      type: values.type,
      value:
        values.type === "PERCENT"
          ? Math.round(Number(values.value) || 0)
          : Math.round((Number(values.value) || 0) * 100),
      minOrderPaise: Math.round((Number(values.minOrder) || 0) * 100),
      maxDiscountPaise:
        values.type === "PERCENT" && values.maxDiscount
          ? Math.round((Number(values.maxDiscount) || 0) * 100)
          : null,
      maxUses: values.maxUses ? Math.max(0, Math.round(Number(values.maxUses) || 0)) : null,
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      isActive: values.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateCouponAction(editingId, payload)
        : await createCouponAction(payload);
      setState(res);
      if (res.ok) reset();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    startTransition(async () => {
      const res = await deleteCouponAction(id);
      setState(res);
      if (res.ok && editingId === id) reset();
    });
  }

  function toggle(id: string) {
    startTransition(async () => {
      const res = await toggleCouponAction(id);
      setState(res);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Discount</th>
              <th className="px-4 py-2 font-medium">Min order</th>
              <th className="px-4 py-2 font-medium">Uses</th>
              <th className="px-4 py-2 font-medium">Expires</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No coupons yet. Create your first one.
                </td>
              </tr>
            )}
            {coupons.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="font-medium">{row.code}</div>
                  {row.description && (
                    <div className="text-xs text-muted-foreground">{row.description}</div>
                  )}
                </td>
                <td className="px-4 py-2">{valueLabel(row)}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {row.minOrderPaise > 0 ? formatINR(row.minOrderPaise) : "—"}
                </td>
                <td className="px-4 py-2">
                  {row.usedCount}
                  {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("en-IN") : "Never"}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggle(row.id)}
                      disabled={pending}
                      title={row.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power className={row.isActive ? "size-4" : "size-4 text-muted-foreground"} />
                    </Button>
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
          <h2 className="font-semibold">{editingId ? "Edit coupon" : "New coupon"}</h2>
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
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
            placeholder="SAVE20"
            required
          />
          {state.fieldErrors?.code && (
            <p className="text-xs text-destructive">{state.fieldErrors.code[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            placeholder="20% off your order"
          />
          {state.fieldErrors?.description && (
            <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={values.type === "PERCENT" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setValues((v) => ({ ...v, type: "PERCENT" }))}
            >
              Percent
            </Button>
            <Button
              type="button"
              variant={values.type === "FLAT" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setValues((v) => ({ ...v, type: "FLAT" }))}
            >
              Flat amount
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="value">{values.type === "PERCENT" ? "Percent (%)" : "Amount (₹)"}</Label>
            <Input
              id="value"
              type="number"
              min={1}
              value={values.value}
              onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
              required
            />
            {state.fieldErrors?.value && (
              <p className="text-xs text-destructive">{state.fieldErrors.value[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minOrder">Min order (₹)</Label>
            <Input
              id="minOrder"
              type="number"
              min={0}
              value={values.minOrder}
              onChange={(e) => setValues((v) => ({ ...v, minOrder: e.target.value }))}
            />
          </div>
        </div>

        {values.type === "PERCENT" && (
          <div className="space-y-2">
            <Label htmlFor="maxDiscount">Max discount (₹, optional)</Label>
            <Input
              id="maxDiscount"
              type="number"
              min={0}
              value={values.maxDiscount}
              onChange={(e) => setValues((v) => ({ ...v, maxDiscount: e.target.value }))}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="maxUses">Max uses (optional)</Label>
          <Input
            id="maxUses"
            type="number"
            min={0}
            value={values.maxUses}
            onChange={(e) => setValues((v) => ({ ...v, maxUses: e.target.value }))}
            placeholder="Unlimited"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startsAt">Starts</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={values.startsAt}
              onChange={(e) => setValues((v) => ({ ...v, startsAt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expires</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={values.expiresAt}
              onChange={(e) => setValues((v) => ({ ...v, expiresAt: e.target.value }))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
            className="size-4"
          />
          Active
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {pending ? "Saving…" : editingId ? "Save changes" : "Create coupon"}
        </Button>
      </form>
    </div>
  );
}
