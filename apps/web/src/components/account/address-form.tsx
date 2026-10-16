import { useActionState } from "react";
import { upsertAddressAction } from "@/app/actions/addresses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/action-result";

type Props = {
  address?: {
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
  onClose?: () => void;
};

const initialState: FormState = { ok: false };

export function AddressForm({ address, onClose }: Props) {
  const [state, formAction, pending] = useActionState(upsertAddressAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {address?.id ? <input type="hidden" name="id" value={address.id} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={address?.fullName ?? ""} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={address?.phone ?? ""} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="label">Label (optional)</Label>
        <Input id="label" name="label" defaultValue={address?.label ?? ""} placeholder="Home, Work" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="line1">Address line 1</Label>
        <Input id="line1" name="line1" defaultValue={address?.line1 ?? ""} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="line2">Address line 2 (optional)</Label>
        <Input id="line2" name="line2" defaultValue={address?.line2 ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={address?.city ?? ""} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={address?.state ?? ""} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" name="pincode" defaultValue={address?.pincode ?? ""} required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" name="latitude" type="number" step="any" defaultValue={address?.latitude ?? 0} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" name="longitude" type="number" step="any" defaultValue={address?.longitude ?? 0} required />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input id="isDefault" name="isDefault" type="checkbox" defaultChecked={address?.isDefault ?? false} className="size-4 rounded border" />
        <Label htmlFor="isDefault">Set as default</Label>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        {onClose ? (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save address"}
        </Button>
      </div>
    </form>
  );
}
