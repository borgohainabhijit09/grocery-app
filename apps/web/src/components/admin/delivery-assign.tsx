"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignDeliveryPartnerAction } from "@/app/actions/admin/delivery";
import { Button } from "@/components/ui/button";

type Partner = { id: string; name: string; isActive: boolean };

type Props = {
  orderId: string;
  isDeliveryOrder: boolean;
  partners: Partner[];
  currentPartnerId: string | null;
};

export function DeliveryAssign({ orderId, isDeliveryOrder, partners, currentPartnerId }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentPartnerId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isDeliveryOrder) {
    return <p className="text-sm text-muted-foreground">Not applicable for pickup orders.</p>;
  }

  const options = [...partners].sort((a, b) => a.name.localeCompare(b.name));

  function assign(partnerId: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await assignDeliveryPartnerAction(orderId, partnerId);
      if (res.ok) {
        setSelected(partnerId ?? "");
        router.refresh();
      } else {
        setError(res.error ?? "Assignment failed.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <select
        aria-label="Delivery partner"
        value={selected}
        disabled={pending || options.length === 0}
        onChange={(e) => setSelected(e.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">Select a delivery partner…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.isActive ? "" : " (inactive)"}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !selected}
          onClick={() => assign(selected)}
        >
          Assign
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !currentPartnerId}
          onClick={() => assign(null)}
        >
          Unassign
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No delivery partners yet. Create one under Delivery partners.
        </p>
      ) : null}
    </div>
  );
}
