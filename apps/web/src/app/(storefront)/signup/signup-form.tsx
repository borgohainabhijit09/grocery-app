"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  requestSignupOtpAction,
  verifySignupOtpAction,
  resendOtpAction,
  type OtpActionResult,
} from "@/app/actions/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DevCodeHint({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <p className="rounded-md border border-dashed bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
      Dev mode (no SMS/email provider): your code is{" "}
      <span className="font-mono font-semibold text-foreground">{code}</span>
    </p>
  );
}

export function SignupForm() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [dismissed, setDismissed] = useState<OtpActionResult | undefined>(undefined);

  const [requestState, requestAction, requesting] = useActionState<
    OtpActionResult | undefined,
    FormData
  >(requestSignupOtpAction, undefined);

  const [verifyState, verifyAction, verifying] = useActionState<
    OtpActionResult | undefined,
    FormData
  >(verifySignupOtpAction, undefined);

  const [resendState, resendAction, resending] = useActionState<
    OtpActionResult | undefined,
    FormData
  >(resendOtpAction, undefined);

  useEffect(() => {
    if (verifyState?.success) {
      router.push("/");
      router.refresh();
    }
  }, [verifyState, router]);

  const otpActive = requestState?.step === "otp" && requestState !== dismissed;
  const devCode = resendState?.devCode ?? requestState?.devCode;
  const emailMasked = resendState?.emailMasked ?? requestState?.emailMasked;

  const fieldError = (name: string) => requestState?.fieldErrors?.[name]?.[0];

  if (otpActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Verify your number</CardTitle>
          <CardDescription>
            {emailMasked
              ? `We sent a 6-digit code to ${emailMasked}.`
              : `Enter the 6-digit code sent to ${phone}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="phone" value={phone} />
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                placeholder="123456"
              />
            </div>

            <DevCodeHint code={devCode} />

            {verifyState?.error && (
              <p className="text-sm text-destructive">{verifyState.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "Verifying..." : "Verify and create account"}
            </Button>
          </form>

          <form action={resendAction} className="space-y-2">
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="purpose" value="SIGNUP" />
            {resendState?.error && (
              <p className="text-sm text-destructive">{resendState.error}</p>
            )}
            <Button type="submit" variant="outline" className="w-full" disabled={resending}>
              {resending ? "Sending..." : "Resend code"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setDismissed(requestState)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different number
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          We&apos;ll email a one-time code to verify your mobile number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={requestAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required autoComplete="name" />
            {fieldError("name") && <p className="text-xs text-destructive">{fieldError("name")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
            {fieldError("email") && <p className="text-xs text-destructive">{fieldError("email")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              name="phone"
              inputMode="numeric"
              required
              placeholder="10-digit number"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {fieldError("phone") && <p className="text-xs text-destructive">{fieldError("phone")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
            {fieldError("password") && (
              <p className="text-xs text-destructive">{fieldError("password")}</p>
            )}
          </div>

          {requestState?.error && <p className="text-sm text-destructive">{requestState.error}</p>}

          <Button type="submit" className="w-full" disabled={requesting}>
            {requesting ? "Sending code..." : "Send verification code"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
