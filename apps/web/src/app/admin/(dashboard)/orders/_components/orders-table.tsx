"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, MoreHorizontal, Truck, UserRound } from "lucide-react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, formatINR, type OrderStatus } from "shared";

import { assignDeliveryPartnerAction } from "@/app/actions/admin/delivery";
import {
  bulkUpdateOrderStatusAction,
  updateOrderStatusAction,
} from "@/app/actions/admin/orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerContact: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  itemCount: number;
  partnerId: string | null;
  partnerName: string | null;
  totalPaise: number;
};

export type PartnerOption = { id: string; name: string };

const BULK_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
];

export function OrdersTable({
  orders,
  partners,
}: {
  orders: OrderRow[];
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = orders.length > 0 && selected.size === orders.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runStatus(orderId: string, status: OrderStatus) {
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, status);
      if (res.ok) {
        toast({
          title: "Order updated",
          variant: "success",
          description: `Moved to ${ORDER_STATUS_LABELS[status]}.`,
        });
        router.refresh();
      } else {
        toast({ title: "Update failed", variant: "error", description: res.error });
      }
    });
  }

  function runAssign(orderId: string, partnerId: string | null) {
    startTransition(async () => {
      const res = await assignDeliveryPartnerAction(orderId, partnerId);
      if (res.ok) {
        toast({ title: partnerId ? "Partner assigned" : "Assignment cleared", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Assignment failed", variant: "error", description: res.error });
      }
    });
  }

  function runBulkStatus(status: OrderStatus) {
    const ids = [...selected];
    startTransition(async () => {
      const res = await bulkUpdateOrderStatusAction(ids, status);
      if (res.ok) {
        toast({
          title: `${ids.length} order(s) updated`,
          variant: "success",
          description: `Moved to ${ORDER_STATUS_LABELS[status]}.`,
        });
        setSelected(new Set());
        router.refresh();
      } else {
        toast({ title: "Bulk update failed", variant: "error", description: res.error });
      }
    });
  }

  function runBulkAssign(partnerId: string) {
    const ids = [...selected];
    startTransition(async () => {
      let ok = 0;
      for (const id of ids) {
        const res = await assignDeliveryPartnerAction(id, partnerId || null);
        if (res.ok) ok += 1;
      }
      toast({
        title: ok === ids.length ? "Partners assigned" : "Some assignments failed",
        variant: ok === ids.length ? "success" : "error",
        description: `${ok}/${ids.length} updated.`,
      });
      setSelected(new Set());
      router.refresh();
    });
  }

  const hasDeliverySelected = useMemo(
    () => orders.some((o) => selected.has(o.id) && o.fulfillmentType === "DELIVERY"),
    [orders, selected]
  );

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="text-xs text-muted-foreground">Set status:</span>
          <div className="flex flex-wrap items-center gap-1">
            {BULK_STATUSES.map((status) => (
              <Button
                key={status}
                size="xs"
                variant="outline"
                disabled={pending}
                onClick={() => runBulkStatus(status)}
              >
                {ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          {partners.length > 0 && hasDeliverySelected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="outline" disabled={pending}>
                  <Truck className="size-3.5" />
                  Assign partner
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Delivery partners</DropdownMenuLabel>
                {partners.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => runBulkAssign(p.id)}>
                    <UserRound className="size-4" />
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all orders"
              />
            </TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Placed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableEmpty colSpan={9}>No orders found.</TableEmpty>
          ) : (
            orders.map((o) => (
              <TableRow key={o.id} data-state={selected.has(o.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggleOne(o.id)}
                    aria-label={`Select ${o.orderNumber}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">
                    {o.orderNumber}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {o.itemCount} item{o.itemCount === 1 ? "" : "s"} ·{" "}
                    {o.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.customerContact}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(o.placedAt).toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {o.partnerName ?? (o.fulfillmentType === "DELIVERY" ? "Unassigned" : "Pickup")}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <div className="mt-0.5 text-xs text-muted-foreground">{o.paymentMethod}</div>
                </TableCell>
                <TableCell className="text-right font-medium">{formatINR(o.totalPaise)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" disabled={pending}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ORDER_STATUS_FLOW[o.status].length === 0 ? (
                        <DropdownMenuItem disabled>No further steps</DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuLabel>Move to</DropdownMenuLabel>
                          {ORDER_STATUS_FLOW[o.status].map((status) => (
                            <DropdownMenuItem key={status} onSelect={() => runStatus(o.id, status)}>
                              {ORDER_STATUS_LABELS[status]}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      {partners.length > 0 && o.fulfillmentType === "DELIVERY" ? (
                        <>
                          <DropdownMenuLabel>Assign partner</DropdownMenuLabel>
                          {partners.map((p) => (
                            <DropdownMenuItem key={p.id} onSelect={() => runAssign(o.id, p.id)}>
                              {o.partnerId === p.id ? (
                                <Check className="size-4" />
                              ) : (
                                <UserRound className="size-4" />
                              )}
                              {p.name}
                            </DropdownMenuItem>
                          ))}
                          {o.partnerId ? (
                            <DropdownMenuItem onSelect={() => runAssign(o.id, null)}>
                              Clear assignment
                            </DropdownMenuItem>
                          ) : null}
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
