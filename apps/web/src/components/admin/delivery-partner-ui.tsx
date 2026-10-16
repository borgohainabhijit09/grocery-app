"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDeliveryPartnerAction,
  toggleDeliveryPartnerAction,
} from "@/app/actions/admin/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeliveryPartnerForm() {
  const [state, action, pending] = useActionState(createDeliveryPartnerAction, undefined);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="dp-name">Name</Label>
        <Input id="dp-name" name="name" placeholder="Rahul Sharma" />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dp-email">Email</Label>
        <Input id="dp-email" name="email" type="email" placeholder="partner@example.com" />
        {state?.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dp-phone">Phone (optional)</Label>
        <Input id="dp-phone" name="phone" type="tel" placeholder="9876543210" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dp-password">Password</Label>
        <Input id="dp-password" name="password" type="password" placeholder="At least 8 characters" />
        {state?.fieldErrors?.password ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>
      ) : state?.ok ? (
        <p className="text-sm text-emerald-700 sm:col-span-2">Delivery partner created.</p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create delivery partner"}
        </Button>
      </div>
    </form>
  );
}

export function TogglePartnerButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await toggleDeliveryPartnerAction(userId);
          if (res.ok) router.refresh();
        });
      }}
    >
      {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
