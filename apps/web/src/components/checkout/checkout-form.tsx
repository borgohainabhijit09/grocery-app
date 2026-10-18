"use client";

import { useState, useTransition, useActionState, type ReactNode } from "react";
import Link from "next/link";
import {
  Banknote,
  Check,
  Clock,
  CreditCard,
  MapPin,
  StickyNote,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { placeOrderAction, validateCouponAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/action-result";
import { cn } from "@/lib/utils";
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
  serviceable?: boolean;
};

type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
};

type AvailableCoupon = {
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
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
  availableCoupons?: AvailableCoupon[];
};

const initialState: FormState = { ok: false };

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(key: string) {
  const d = new Date(`${key}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function daySubLabel(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function CheckoutForm({
  addresses,
  slots,
  settings,
  cartSummary,
  razorpayEnabled,
  availableCoupons = [],
}: Props) {
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const defaultAddressId = addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "";
  const [addressId, setAddressId] = useState<string>(defaultAddressId);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [slotId, setSlotId] = useState<string>("");
  const [coupon, setCoupon] = useState("");
  const [discountPaise, setDiscountPaise] = useState(cartSummary.discountPaise);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [payment, setPayment] = useState<"COD" | "RAZORPAY">("COD");
  const [pendingCoupon, startCoupon] = useTransition();
  const [state, formAction, pendingOrder] = useActionState(placeOrderAction, initialState);

  const filteredSlots = slots.filter((s) => s.fulfillmentType === fulfillment);

  const slotDays: { key: string; items: Slot[] }[] = [];
  for (const s of filteredSlots) {
    const key = s.date.slice(0, 10);
    const existing = slotDays.find((d) => d.key === key);
    if (existing) existing.items.push(s);
    else slotDays.push({ key, items: [s] });
  }
  const activeDayKey = slotDays.some((d) => d.key === selectedDay)
    ? selectedDay
    : slotDays[0]?.key ?? "";
  const timesForDay = slotDays.find((d) => d.key === activeDayKey)?.items ?? [];

  const effectivePayment = payment === "RAZORPAY" && razorpayEnabled ? "RAZORPAY" : "COD";

  const selectedAddress = addresses.find((a) => a.id === addressId);
  const deliveryBlocked =
    fulfillment === "DELIVERY" && selectedAddress != null && selectedAddress.serviceable === false;

  function switchFulfillment(next: "DELIVERY" | "PICKUP") {
    setFulfillment(next);
    setSlotId("");
    setSelectedDay("");
  }

  function selectDay(key: string) {
    setSelectedDay(key);
    setSlotId("");
  }

  function applyCouponCode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    startCoupon(async () => {
      const res = await validateCouponAction(code, cartSummary.subtotalPaise);
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

  const slotStep = fulfillment === "DELIVERY" ? 3 : 2;
  const paymentStep = fulfillment === "DELIVERY" ? 4 : 3;

  return (
    <form
      action={formAction}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
    >
      <input type="hidden" name="fulfillmentType" value={fulfillment} />
      <input type="hidden" name="couponCode" value={coupon} />
      <input type="hidden" name="paymentMethod" value={effectivePayment} />
      <input type="hidden" name="slotId" value={slotId} />

      <div className="space-y-5">
        <SectionCard step={1} icon={<Truck className="size-5" />} title="How would you like your order?">
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              active={fulfillment === "DELIVERY"}
              onClick={() => switchFulfillment("DELIVERY")}
              icon={<Truck className="size-5" />}
              title="Home delivery"
              description="Delivered to your doorstep"
            />
            <Choice
              active={fulfillment === "PICKUP"}
              onClick={() => switchFulfillment("PICKUP")}
              icon={<Store className="size-5" />}
              title="Store pickup"
              description="Collect from the store, no fee"
            />
          </div>
        </SectionCard>

        {fulfillment === "DELIVERY" ? (
          <SectionCard step={2} icon={<MapPin className="size-5" />} title="Delivery address">
            {addresses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No addresses saved.{" "}
                <Link href="/account/addresses" className="text-primary underline">
                  Add one
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => {
                  const active = addressId === a.id;
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent"
                      )}
                    >
                      <input
                        type="radio"
                        name="addressId"
                        value={a.id}
                        checked={active}
                        onChange={(e) => setAddressId(e.target.value)}
                        className="mt-1"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {a.label || "Address"}
                          {a.isDefault ? (
                            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                              Default
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {a.fullName}, {a.phone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
                        </p>
                        {a.serviceable === false ? (
                          <p className="text-xs font-medium text-destructive">
                            Outside our delivery area — choose another address or store pickup.
                          </p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {state.fieldErrors?.addressId ? (
              <p className="text-sm text-destructive">{state.fieldErrors.addressId[0]}</p>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard step={slotStep} icon={<Clock className="size-5" />} title="Choose a slot">
          {slotDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No slots available for {fulfillment.toLowerCase()}. Please try again later.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pick a date
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {slotDays.map((d) => {
                    const active = d.key === activeDayKey;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => selectDay(d.key)}
                        className={cn(
                          "flex min-w-[5rem] shrink-0 flex-col items-center rounded-xl border px-4 py-2.5 text-center transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        <span className="text-sm font-semibold">{dayLabel(d.key)}</span>
                        <span
                          className={cn(
                            "text-xs",
                            active ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {daySubLabel(d.key)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pick a time
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {timesForDay.map((s) => {
                    const active = slotId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSlotId(s.id)}
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition",
                          active
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "hover:border-primary hover:bg-primary/5"
                        )}
                      >
                        {active ? <Check className="size-3.5" /> : null}
                        {s.startTime} – {s.endTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {state.fieldErrors?.slotId ? (
            <p className="text-sm text-destructive">{state.fieldErrors.slotId[0]}</p>
          ) : null}
        </SectionCard>

        <SectionCard step={paymentStep} icon={<CreditCard className="size-5" />} title="Payment method">
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              active={payment === "COD"}
              onClick={() => setPayment("COD")}
              icon={<Banknote className="size-5" />}
              title="Cash on delivery"
              description="Pay when you receive your order"
            />
            <Choice
              active={payment === "RAZORPAY"}
              disabled={!razorpayEnabled}
              onClick={() => setPayment("RAZORPAY")}
              icon={<CreditCard className="size-5" />}
              title="Pay online"
              description={razorpayEnabled ? "UPI, cards & netbanking" : "Not available"}
            />
          </div>
        </SectionCard>

        <SectionCard icon={<StickyNote className="size-5" />} title="Order notes">
          <Textarea
            name="notes"
            rows={3}
            placeholder="Any delivery instructions... (optional)"
            maxLength={500}
          />
        </SectionCard>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Tag className="size-4" /> Apply coupon
          </h2>

          {availableCoupons.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {availableCoupons.map((c) => {
                const eligible = cartSummary.subtotalPaise >= c.minOrderPaise;
                const selected = coupon.trim().toUpperCase() === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    disabled={!eligible || pendingCoupon}
                    onClick={() => {
                      setCoupon(c.code);
                      applyCouponCode(c.code);
                    }}
                    className={cn(
                      "rounded-lg border border-dashed px-3 py-2 text-left text-xs transition-colors",
                      "hover:border-primary hover:bg-primary/5",
                      selected && "border-primary bg-primary/5",
                      !eligible && "cursor-not-allowed opacity-50 hover:border-dashed hover:bg-transparent"
                    )}
                  >
                    <div className="font-semibold tracking-wide">
                      {c.type === "PERCENT" ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`}
                    </div>
                    <div className="text-muted-foreground">
                      {c.minOrderPaise > 0 ? `Min ${formatINR(c.minOrderPaise)}` : "No minimum"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="h-10"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyCouponCode(coupon)}
              disabled={pendingCoupon}
            >
              Apply
            </Button>
          </div>
          {couponError ? <p className="mt-2 text-xs text-destructive">{couponError}</p> : null}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(cartSummary.subtotalPaise)}</dd>
            </div>
            {effectiveDiscount > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <dt>Discount</dt>
                <dd>-{formatINR(effectiveDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {fulfillment === "PICKUP" ? "Pickup" : "Delivery"}
              </dt>
              <dd>{deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd>{formatINR(tax)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(total)}</dd>
            </div>
          </dl>

          {settings.minOrderValuePaise > cartSummary.subtotalPaise ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Minimum order of {formatINR(settings.minOrderValuePaise)} required.
            </p>
          ) : null}

          {deliveryBlocked ? (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              The selected address is outside our delivery area. Pick another address or choose store
              pickup.
            </p>
          ) : null}

          {state.error ? (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            disabled={pendingOrder || deliveryBlocked}
          >
            {pendingOrder ? "Placing order..." : `Place order · ${formatINR(total)}`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            You can review the order details after placing it.
          </p>
        </div>
      </aside>
    </form>
  );
}

function SectionCard({
  icon,
  step,
  title,
  children,
}: {
  icon: ReactNode;
  step?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {step ? (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {step}
            </span>
          ) : null}
          <span>{title}</span>
        </h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Choice({
  active,
  onClick,
  icon,
  title,
  description,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5 text-left transition",
        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent"
      )}
    >
      <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      {active ? <Check className="ml-auto size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}
