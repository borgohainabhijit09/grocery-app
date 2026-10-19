"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Pencil, Power, Trash2, Plus, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bulkCreateSlotsAction,
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

type BulkValues = {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  delivery: boolean;
  pickup: boolean;
  capacity: string;
  isActive: boolean;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekAheadISO() {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

const emptyForm: FormValues = {
  date: todayISO(),
  startTime: "09:00",
  endTime: "12:00",
  fulfillmentType: "DELIVERY",
  capacity: "20",
  isActive: true,
};

const emptyBulk: BulkValues = {
  startDate: todayISO(),
  endDate: weekAheadISO(),
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "12:00",
  delivery: true,
  pickup: false,
  capacity: "20",
  isActive: true,
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function SlotsManager({ slots }: { slots: SlotRow[] }) {
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [bulk, setBulk] = useState<BulkValues>(emptyBulk);
  const [formState, setFormState] = useState<FormState>({});
  const [bulkState, setBulkState] = useState<FormState & { count?: number }>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group slots by date
  const grouped = slots.reduce<Record<string, SlotRow[]>>((acc, row) => {
    (acc[row.date] ??= []).push(row);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, date: todayISO() });
    setFormState({});
    setDialogMode("add");
  }

  function openEdit(row: SlotRow) {
    setEditingId(row.id);
    setForm({
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      fulfillmentType: row.fulfillmentType,
      capacity: String(row.capacity),
      isActive: row.isActive,
    });
    setFormState({});
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingId(null);
    setFormState({});
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      fulfillmentType: form.fulfillmentType,
      capacity: Math.max(0, Math.round(Number(form.capacity) || 0)),
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateSlotAction(editingId, payload)
        : await createSlotAction(payload);
      setFormState(res);
      if (res.ok) closeDialog();
    });
  }

  function toggle(id: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await toggleSlotAction(id);
      if (!res.ok) setActionError(res.error ?? "Failed to toggle slot.");
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this slot?")) return;
    setActionError(null);
    startTransition(async () => {
      const res = await deleteSlotAction(id);
      if (!res.ok) setActionError(res.error ?? "Failed to delete slot.");
    });
  }

  function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    const types: ("DELIVERY" | "PICKUP")[] = [];
    if (bulk.delivery) types.push("DELIVERY");
    if (bulk.pickup) types.push("PICKUP");
    if (types.length === 0) {
      setBulkState({ ok: false, error: "Select at least one type (Delivery or Pickup)." });
      return;
    }
    const payload = {
      startDate: bulk.startDate,
      endDate: bulk.endDate,
      daysOfWeek: bulk.daysOfWeek,
      windows: types.map((t) => ({
        startTime: bulk.startTime,
        endTime: bulk.endTime,
        fulfillmentType: t,
        capacity: Math.max(0, Math.round(Number(bulk.capacity) || 0)),
      })),
      isActive: bulk.isActive,
    };
    startTransition(async () => {
      const res = await bulkCreateSlotsAction(payload);
      setBulkState(res);
      if (res.ok) {
        setBulkOpen(false);
        setBulk({ ...emptyBulk, startDate: todayISO(), endDate: weekAheadISO() });
      }
    });
  }

  function toggleDay(day: number) {
    setBulk((b) => ({
      ...b,
      daysOfWeek: b.daysOfWeek.includes(day)
        ? b.daysOfWeek.filter((d) => d !== day)
        : [...b.daysOfWeek, day].sort((a, z) => a - z),
    }));
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} upcoming
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBulkState({});
              setBulkOpen(true);
            }}
          >
            <Zap className="size-4" />
            Bulk Generate
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="size-4" />
            Add Slot
          </Button>
        </div>
      </div>

      {/* Inline action error (toggle / delete) */}
      {actionError && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Date-grouped slot list */}
      {dates.length === 0 ? (
        <div className="rounded-xl border px-4 py-14 text-center text-muted-foreground">
          No upcoming slots.{" "}
          <button
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setBulkState({});
              setBulkOpen(true);
            }}
          >
            Bulk generate
          </button>{" "}
          or{" "}
          <button
            className="text-primary underline-offset-4 hover:underline"
            onClick={openAdd}
          >
            add a slot
          </button>{" "}
          to create delivery and pickup windows.
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((date) => {
            const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const daySlots = grouped[date];
            return (
              <div key={date} className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y">
                  {daySlots.map((row) => {
                    const full = row.capacity > 0 && row.booked >= row.capacity;
                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
                      >
                        <span className="w-28 shrink-0 tabular-nums text-sm font-medium">
                          {row.startTime}–{row.endTime}
                        </span>
                        <Badge
                          variant={
                            row.fulfillmentType === "DELIVERY" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {row.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
                        </Badge>
                        <span
                          className={`text-xs tabular-nums ${full ? "font-medium text-amber-600" : "text-muted-foreground"}`}
                        >
                          {row.booked}/{row.capacity} booked
                        </span>
                        <Badge
                          variant={row.isActive ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="ml-auto flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggle(row.id)}
                            disabled={pending}
                            title={row.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power
                              className={
                                row.isActive ? "size-4" : "size-4 text-muted-foreground"
                              }
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(row)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(row.id)}
                            disabled={pending || row.booked > 0}
                            title={
                              row.booked > 0
                                ? "Has orders — deactivate instead"
                                : "Delete"
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit slot dialog ──────────────────────────────────── */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit slot" : "Add slot"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="slot-date">Date</Label>
              <Input
                id="slot-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((v) => ({ ...v, date: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slot-start">Start</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((v) => ({ ...v, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slot-end">End</Label>
                <Input
                  id="slot-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((v) => ({ ...v, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["DELIVERY", "PICKUP"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={form.fulfillmentType === t ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setForm((v) => ({ ...v, fulfillmentType: t }))}
                  >
                    {t === "DELIVERY" ? "Delivery" : "Pickup"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slot-cap">Capacity</Label>
              <Input
                id="slot-cap"
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) => setForm((v) => ({ ...v, capacity: e.target.value }))}
                required
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.checked }))}
                className="size-4"
              />
              Active immediately
            </label>

            {formState.error && (
              <p className="text-sm text-destructive">{formState.error}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={pending}>
                <CalendarPlus className="size-4" />
                {pending ? "Saving…" : dialogMode === "edit" ? "Save changes" : "Add slot"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk generate dialog ────────────────────────────────────── */}
      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkOpen(false);
            setBulkState({});
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Generate Slots</DialogTitle>
            <DialogDescription>
              Create slots across a date range in one step.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBulk} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-from">From</Label>
                <Input
                  id="bulk-from"
                  type="date"
                  value={bulk.startDate}
                  onChange={(e) => setBulk((b) => ({ ...b, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-to">To</Label>
                <Input
                  id="bulk-to"
                  type="date"
                  value={bulk.endDate}
                  onChange={(e) => setBulk((b) => ({ ...b, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Days of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      bulk.daysOfWeek.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-stime">Start time</Label>
                <Input
                  id="bulk-stime"
                  type="time"
                  value={bulk.startTime}
                  onChange={(e) => setBulk((b) => ({ ...b, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-etime">End time</Label>
                <Input
                  id="bulk-etime"
                  type="time"
                  value={bulk.endTime}
                  onChange={(e) => setBulk((b) => ({ ...b, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Types to create</Label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulk.delivery}
                    onChange={(e) => setBulk((b) => ({ ...b, delivery: e.target.checked }))}
                    className="size-4"
                  />
                  Delivery
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bulk.pickup}
                    onChange={(e) => setBulk((b) => ({ ...b, pickup: e.target.checked }))}
                    className="size-4"
                  />
                  Pickup
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-cap">Capacity per slot</Label>
              <Input
                id="bulk-cap"
                type="number"
                min={0}
                value={bulk.capacity}
                onChange={(e) => setBulk((b) => ({ ...b, capacity: e.target.value }))}
                required
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={bulk.isActive}
                onChange={(e) => setBulk((b) => ({ ...b, isActive: e.target.checked }))}
                className="size-4"
              />
              Active immediately
            </label>

            {bulkState.error && (
              <p className="text-sm text-destructive">{bulkState.error}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={
                  pending ||
                  (!bulk.delivery && !bulk.pickup) ||
                  bulk.daysOfWeek.length === 0
                }
              >
                <Zap className="size-4" />
                {pending ? "Generating…" : "Generate Slots"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
