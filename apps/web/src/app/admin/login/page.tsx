"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { staffLoginAction, type AdminActionResult } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionResult | undefined, FormData>(
    staffLoginAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      router.push(state.redirectTo ?? "/admin");
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Admin sign in</CardTitle>
          <CardDescription>Staff, administrator and delivery partner access only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
