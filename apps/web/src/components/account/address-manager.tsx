"use client";

import { useState, useTransition } from "react";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/addresses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressForm } from "./address-form";

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleDefault(id: string) {
    setPendingId(id);
    await setDefaultAddressAction(id);
    setPendingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    setPendingId(id);
    await deleteAddressAction(id);
    setPendingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your addresses</h2>
        <Button
          onClick={() => {
            setShowNew((v) => !v);
            setEditing(null);
          }}
        >
          {showNew ? "Close" : "Add address"}
        </Button>
      </div>

      {(showNew || editing) ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit address" : "Add new address"}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm
              address={editing ?? undefined}
              onClose={() => {
                setShowNew(false);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          You haven&apos;t saved any addresses yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className={a.isDefault ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{a.label || "Address"}</span>
                  {a.isDefault ? <span className="text-xs font-medium text-primary">Default</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{a.fullName}</p>
                <p>{a.phone}</p>
                <p className="mt-2">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                </p>
                <p>
                  {a.city}, {a.state} - {a.pincode}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(a);
                    setShowNew(true);
                  }}
                >
                  Edit
                </Button>
                {!a.isDefault ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pendingId === a.id}
                    onClick={() => startTransition(() => handleDefault(a.id))}
                  >
                    Set default
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pendingId === a.id}
                  onClick={() => startTransition(() => handleDelete(a.id))}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
