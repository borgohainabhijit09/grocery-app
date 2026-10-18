"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, X, XCircle } from "lucide-react";
import { formatINR } from "shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ServiceabilityResult = {
  serviceable: boolean;
  distanceKm: number | null;
  radiusKm: number;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise: number | null;
  minOrderValuePaise: number;
  enforced: boolean;
};

type Status = "idle" | "loading" | "done" | "error";

export function DeliveryCheckerFloat({
  defaultCoordinates = null,
}: {
  defaultCoordinates?: { latitude: number; longitude: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ServiceabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchServiceability(
    latitude: number,
    longitude: number,
  ): Promise<ServiceabilityResult> {
    const res = await fetch(`/api/v1/serviceability?latitude=${latitude}&longitude=${longitude}`);
    const data = (await res.json()) as ServiceabilityResult & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Could not check delivery availability.");
    return {
      serviceable: data.serviceable,
      distanceKm: data.distanceKm,
      radiusKm: data.radiusKm,
      deliveryFeePaise: data.deliveryFeePaise,
      freeDeliveryAbovePaise: data.freeDeliveryAbovePaise,
      minOrderValuePaise: data.minOrderValuePaise,
      enforced: data.enforced,
    };
  }

  function applyResult(data: ServiceabilityResult) {
    setResult(data);
    setStatus("done");
  }

  function applyError(err: unknown) {
    setError(err instanceof Error ? err.message : "Could not check delivery availability.");
    setStatus("error");
  }

  useEffect(() => {
    if (!defaultCoordinates) return;
    let active = true;
    const { latitude, longitude } = defaultCoordinates;
    void (async () => {
      try {
        const data = await fetchServiceability(latitude, longitude);
        if (active) applyResult(data);
      } catch (err) {
        if (active) applyError(err);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      applyError("Location is not available in this browser.");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void fetchServiceability(pos.coords.latitude, pos.coords.longitude)
          .then(applyResult)
          .catch(applyError);
      },
      () => applyError("We couldn't access your location. Please allow location access."),
    );
  }

  const dotColor =
    status === "done" && result
      ? result.serviceable
        ? "bg-emerald-500"
        : "bg-red-500"
      : status === "loading"
        ? "bg-amber-400"
        : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition hover:shadow-xl"
      >
        <MapPin className="size-4 text-primary" />
        Check delivery
        {dotColor ? (
          <span className={cn("size-2 rounded-full", dotColor)} aria-hidden="true" />
        ) : null}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm animate-scale-in overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b bg-secondary/40 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="size-4 text-primary" />
          Check delivery availability
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          Share your location to see if we deliver to your area and what it costs.
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
          {status === "loading" ? "Checking..." : "Use my current location"}
        </Button>

        {status === "done" && result ? (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm",
              result.serviceable
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            <p className="flex items-center gap-2 font-medium">
              {result.serviceable ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <XCircle className="size-4 shrink-0" />
              )}
              {result.serviceable
                ? "We deliver to your area!"
                : "We don't deliver here yet."}
            </p>
            <p className="mt-1 text-xs">
              {result.distanceKm != null
                ? `${result.distanceKm} km away (within ${result.radiusKm} km).`
                : "We currently deliver across the city."}
            </p>
            {result.serviceable ? (
              <p className="mt-0.5 text-xs">
                Delivery {formatINR(result.deliveryFeePaise)}
                {result.freeDeliveryAbovePaise
                  ? ` · free above ${formatINR(result.freeDeliveryAbovePaise)}`
                  : ""}
                {result.minOrderValuePaise
                  ? ` · min order ${formatINR(result.minOrderValuePaise)}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {status === "error" && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
