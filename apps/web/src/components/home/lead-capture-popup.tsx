"use client";

import { useEffect, useState, useActionState } from "react";
import { Gift, X } from "lucide-react";
import { captureLeadAction, type LeadResult } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "freshbasket.leadPopupSeen";
const initialState: LeadResult = {};

export function LeadCapturePopup() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(captureLeadAction, initialState);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close offer"
        onClick={close}
        className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="animate-scale-in relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="relative bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-5 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1 transition-colors hover:bg-white/20"
          >
            <X className="size-4" />
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25">
            <Gift className="size-3.5" /> Festive offer
          </span>
          <h3 className="mt-3 text-xl font-bold">Get ₹100 off your first order</h3>
          <p className="mt-1 text-sm text-white/80">
            Drop your details and we&apos;ll send a welcome coupon code.
          </p>
        </div>

        {state.ok ? (
          <div className="px-6 py-8 text-center">
            <p className="text-lg font-semibold">You&apos;re on the list! 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll reach out shortly with your offer.
            </p>
            <Button className="mt-5 w-full" onClick={close}>
              Continue shopping
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4 px-6 py-5">
            {state.error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="lead-name">Name</Label>
              <Input id="lead-name" name="name" placeholder="Your name" autoComplete="name" required />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-phone">Mobile number</Label>
              <Input
                id="lead-phone"
                name="phone"
                inputMode="numeric"
                placeholder="10-digit mobile"
                autoComplete="tel"
                required
              />
              {state.fieldErrors?.phone ? (
                <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-email">Email (optional)</Label>
              <Input id="lead-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
              {state.fieldErrors?.email ? (
                <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Submitting..." : "Claim my offer"}
            </Button>
            <button
              type="button"
              onClick={close}
              className="w-full text-center text-xs text-muted-foreground hover:underline"
            >
              No thanks
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
