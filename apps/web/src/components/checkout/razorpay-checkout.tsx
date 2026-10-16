"use client";

import { useActionState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { razorpayVerifyAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/action-result";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void };

type RazorpayOptions = {
  key: string;
  order_id: string;
  name: string;
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
};

export function RazorpayCheckout({ orderId, rzpOrderId }: { orderId: string; rzpOrderId: string }) {
  const [state, formAction, pending] = useActionState(
    razorpayVerifyAction,
    { ok: false } as FormState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.push(`/checkout/success?orderId=${orderId}`);
    }
  }, [state.ok, orderId, router]);

  function startPayment() {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key || typeof window === "undefined") return;
    const w = window as RazorpayWindow;
    if (!w.Razorpay) return;

    const options: RazorpayOptions = {
      key,
      order_id: rzpOrderId,
      name: "Grocery App",
      theme: { color: "#16a34a" },
      handler: function (response: RazorpayResponse) {
        const form = document.getElementById("rzp-form") as HTMLFormElement | null;
        if (!form) return;
        (form.elements.namedItem("razorpay_order_id") as HTMLInputElement).value =
          response.razorpay_order_id;
        (form.elements.namedItem("razorpay_payment_id") as HTMLInputElement).value =
          response.razorpay_payment_id;
        (form.elements.namedItem("razorpay_signature") as HTMLInputElement).value =
          response.razorpay_signature;
        form.requestSubmit();
      },
    };

    const rzp = new w.Razorpay(options);
    rzp.open();
  }

  return (
    <div className="space-y-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Button onClick={startPayment} disabled={pending}>
        {pending ? "Verifying..." : "Pay now"}
      </Button>

      <form id="rzp-form" action={formAction} className="hidden">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="razorpay_order_id" />
        <input type="hidden" name="razorpay_payment_id" />
        <input type="hidden" name="razorpay_signature" />
      </form>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </div>
  );
}
