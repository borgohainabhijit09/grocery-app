"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupAction, type ActionResult } from "@/app/actions/auth";
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

export default function SignupPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    signupAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Shop faster and track your deliveries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required autoComplete="name" />
              {fieldError("name") && (
                <p className="text-xs text-destructive">{fieldError("name")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
              {fieldError("email") && (
                <p className="text-xs text-destructive">{fieldError("email")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" name="phone" inputMode="numeric" required placeholder="10-digit number" />
              {fieldError("phone") && (
                <p className="text-xs text-destructive">{fieldError("phone")}</p>
              )}
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
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating account..." : "Create account"}
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
    </div>
  );
}
