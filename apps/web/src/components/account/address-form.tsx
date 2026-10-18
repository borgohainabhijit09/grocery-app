"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
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

type GeoStatus = "idle" | "locating" | "captured" | "denied" | "error" | "unsupported";

const initialState: FormState = { ok: false };

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

function statusMessage(status: GeoStatus): string {
  switch (status) {
    case "locating":
      return "Getting your location…";
    case "captured":
      return "Location captured from your browser.";
    case "denied":
      return "Location permission denied. Enter coordinates manually.";
    case "error":
      return "Couldn't get your location. Enter coordinates manually.";
    case "unsupported":
      return "Geolocation isn't supported by this browser. Enter coordinates manually.";
    default:
      return "We use your browser location to pin the delivery point.";
  }
}

export function AddressForm({ address, onClose }: Props) {
  const [state, formAction, pending] = useActionState(upsertAddressAction, initialState);
  const [latitude, setLatitude] = useState(address ? String(address.latitude) : "");
  const [longitude, setLongitude] = useState(address ? String(address.longitude) : "");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const autoRequested = useRef(false);

  const captureLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoStatus("captured");
      },
      (err) => setGeoStatus(err.code === 1 ? "denied" : "error"),
      GEO_OPTIONS
    );
  }, []);

  useEffect(() => {
    if (autoRequested.current) return;
    autoRequested.current = true;
    if (address?.id) return;
    if (latitude || longitude) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoStatus("captured");
      },
      (err) => setGeoStatus(err.code === 1 ? "denied" : "error"),
      GEO_OPTIONS
    );
  }, [address?.id, latitude, longitude]);

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

      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4 text-primary" />
            Delivery coordinates
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            disabled={geoStatus === "locating"}
          >
            {geoStatus === "locating" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Locating…
              </>
            ) : (
              "Use current location"
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{statusMessage(geoStatus)}</p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 26.144500"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="e.g. 91.736200"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>
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
