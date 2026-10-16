"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { placeOrderAction, validateCouponAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/action-result";
import { formatINR } from "shared";

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
  isDefault: boolean;
};

type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
};

type Props = {
  addresses: Address[];
  slots: Slot[];
  settings: {
    deliveryFeePaise: number;
    freeDeliveryAbovePaise: number | null;
    minOrderValuePaise: number;
    taxRatePercent: number;
  };
  cartSummary: {
    subtotalPaise: number;
    deliveryFeePaise: number;
    discountPaise: number;
    taxPaise: number;
    totalPaise: number;
  };
  razorpayEnabled: boolean;
};

const initialState: FormState = { ok: false };

export function CheckoutForm({ addresses, slots, settings, cartSummary, razorpayEnabled }: Props) {
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [addressId, setAddressId] = useState<string>(defaultAddressId);
  const [slotId, setSlotId] = useState<string>("");
  const [coupon, setCoupon] = useState("");
  const [discountPaise, setDiscountPaise] = useState(cartSummary.discountPaise);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [payment, setPayment] = useState<"COD" | "RAZORPAY">("COD");
  const [pendingCoupon, startCoupon] = useTransition();
  const [state, formAction, pendingOrder] = useActionState(placeOrderAction, initialState);

  const filteredSlots = slots.filter((s) => s.fulfillmentType === fulfillment);
  const effectivePayment = payment === "RAZORPAY" && razorpayEnabled ? "RAZORPAY" : "COD";

  function switchFulfillment(next: "DELIVERY" | "PICKUP") {
    setFulfillment(next);
    setSlotId("");
  }

  function applyCoupon() {
    setCouponError(null);
    startCoupon(async () => {
      const res = await validateCouponAction(coupon, cartSummary.subtotalPaise);
      if (res.ok && res.discountPaise != null) {
        setDiscountPaise(res.discountPaise);
      } else {
        setDiscountPaise(0);
        setCouponError(res.error ?? "Coupon not valid.");
      }
    });
  }

  const effectiveDiscount = Math.min(discountPaise, cartSummary.subtotalPaise);
  const deliveryFee =
    fulfillment === "PICKUP"
      ? 0
      : cartSummary.subtotalPaise >= (settings.freeDeliveryAbovePaise ?? Infinity)
        ? 0
        : settings.deliveryFeePaise;
  const taxable = Math.max(0, cartSummary.subtotalPaise - effectiveDiscount);
  const tax = Math.round((taxable * settings.taxRatePercent) / 100);
  const total = taxable + deliveryFee + tax;

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={fulfillment === "DELIVERY" ? "default" : "outline"} onClick={() => switchFulfillment("DELIVERY")}>
              Delivery
            </Button>
            <Button type="button" variant={fulfillment === "PICKUP" ? "default" : "outline"} onClick={() => switchFulfillment("PICKUP")}>
              Pickup
            </Button>
          </div>
          <input type="hidden" name="fulfillmentType" value={fulfillment} />
        </CardContent>
      </Card>

      {fulfillment === "DELIVERY" ? (
        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No addresses saved. <Link href="/account/addresses" className="text-primary underline">Add one</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent">
                    <input type="radio" name="addressId" value={a.id} checked={addressId === a.id} onChange={(e) => setAddressId(e.target.value)} className="mt-1" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{a.label || "Address"} {a.isDefault ? "(Default)" : null}</p>
                      <p className="text-sm text-muted-foreground">{a.fullName}, {a.phone}</p>
                      <p className="text-sm text-muted-foreground">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {state.fieldErrors?.addressId ? (
              <p className="text-sm text-destructive">{state.fieldErrors.addressId[0]}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Time slot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available for {fulfillment.toLowerCase()}.</p>
          ) : (
            <div className="space-y-2">
              {filteredSlots.map((s) => (
                <label key={s.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                  <input type="radio" name="slotId" value={s.id} checked={slotId === s.id} onChange={(e) => setSlotId(e.target.value)} />
                  <span className="text-sm">
                    {new Date(s.date).toLocaleDateString("en-IN")} · {s.startTime} – {s.endTime}
                  </span>
                </label>
              ))}
            </div>
          )}
          {state.fieldErrors?.slotId ? (
            <p className="text-sm text-destructive">{state.fieldErrors.slotId[0]}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="ENTER CODE" />
            <Button type="button" onClick={applyCoupon} disabled={pendingCoupon}>
              Apply
            </Button>
          </div>
          {couponError ? <p className="text-sm text-destructive">{couponError}</p> : null}
          {effectiveDiscount > 0 ? (
            <p className="text-sm text-primary">Discount: {formatINR(effectiveDiscount)}</p>
          ) : null}
          <input type="hidden" name="couponCode" value={coupon} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" variant={payment === "COD" ? "default" : "outline"} onClick={() => setPayment("COD")}>
              Cash on delivery
            </Button>
            <Button type="button" variant={payment === "RAZORPAY" ? "default" : "outline"} onClick={() => setPayment("RAZORPAY")} disabled={!razorpayEnabled}>
              Online (Razorpay)
            </Button>
          </div>
          {!razorpayEnabled && payment === "RAZORPAY" ? (
            <p className="text-xs text-muted-foreground">Razorpay not configured in environment.</p>
          ) : null}
          <input type="hidden" name="paymentMethod" value={effectivePayment} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={3} placeholder="Any delivery instructions..." maxLength={500} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatINR(cartSummary.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatINR(effectiveDiscount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatINR(tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          {settings.minOrderValuePaise > cartSummary.subtotalPaise ? (
            <p className="text-xs text-muted-foreground">Min order {formatINR(settings.minOrderValuePaise)} required.</p>
          ) : null}
        </CardContent>
      </Card>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pendingOrder}>
        {pendingOrder ? "Placing order..." : "Place order"}
      </Button>
    </form>
  );
}
