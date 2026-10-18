"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Pencil, Power, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSlotAction,
  deleteSlotAction,
  toggleSlotAction,
  updateSlotAction,
} from "@/app/actions/admin/slots";
import type { FormState } from "@/app/actions/admin/_shared";

export type SlotRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  capacity: number;
  booked: number;
  available: number;
  isActive: boolean;
};

type FormValues = {
  date: string;
  startTime: string;
  endTime: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  capacity: string;
  isActive: boolean;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const empty: FormValues = {
  date: todayISO(),
  startTime: "09:00",
  endTime: "12:00",
  fulfillmentType: "DELIVERY",
  capacity: "20",
  isActive: true,
};

export function SlotsManager({ slots }: { slots: SlotRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>(empty);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function reset() {
    setEditingId(null);
    setValues({ ...empty, date: todayISO() });
    setState({});
  }

  function startEdit(row: SlotRow) {
    setEditingId(row.id);
    setState({});
    setValues({
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      fulfillmentType: row.fulfillmentType,
      capacity: String(row.capacity),
      isActive: row.isActive,
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      fulfillmentType: values.fulfillmentType,
      capacity: Math.max(0, Math.round(Number(values.capacity) || 0)),
      isActive: values.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateSlotAction(editingId, payload)
        : await createSlotAction(payload);
      setState(res);
      if (res.ok) reset();
    });
  }

  function toggle(id: string) {
    startTransition(async () => {
      setState(await toggleSlotAction(id));
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this slot?")) return;
    startTransition(async () => {
      const res = await deleteSlotAction(id);
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
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Capacity</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No slots yet. Add your first delivery or pickup window.
                </td>
              </tr>
            )}
            {slots.map((row) => {
              const full = row.capacity > 0 && row.booked >= row.capacity;
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(`${row.date}T00:00:00`).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                    {row.startTime}–{row.endTime}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={row.fulfillmentType === "DELIVERY" ? "default" : "secondary"}>
                      {row.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <span className={full ? "font-medium text-amber-600" : undefined}>
                      {row.booked} / {row.capacity}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={row.isActive ? "success" : "secondary"}>
                      {row.isActive ? "Active" : "Inactive"}
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
                        disabled={pending || row.booked > 0}
                        title={row.booked > 0 ? "Has orders — deactivate instead" : "Delete"}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border p-5">
        <h2 className="text-base font-semibold">
          {editingId ? "Edit slot" : "Add slot"}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start</Label>
            <Input
              id="startTime"
              type="time"
              value={values.startTime}
              onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End</Label>
            <Input
              id="endTime"
              type="time"
              value={values.endTime}
              onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Fulfillment</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={values.fulfillmentType === "DELIVERY" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setValues((v) => ({ ...v, fulfillmentType: "DELIVERY" }))}
            >
              Delivery
            </Button>
            <Button
              type="button"
              variant={values.fulfillmentType === "PICKUP" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setValues((v) => ({ ...v, fulfillmentType: "PICKUP" }))}
            >
              Pickup
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (orders)</Label>
          <Input
            id="capacity"
            type="number"
            min={0}
            value={values.capacity}
            onChange={(e) => setValues((v) => ({ ...v, capacity: e.target.value }))}
            required
          />
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

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={pending}>
            <CalendarPlus className="size-4" />
            {pending ? "Saving…" : editingId ? "Save changes" : "Add slot"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={reset} disabled={pending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
