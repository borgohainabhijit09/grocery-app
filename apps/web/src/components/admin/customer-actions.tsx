"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { toggleCustomerActiveAction } from "@/app/actions/admin/customers";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ToggleCustomerButton({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await toggleCustomerActiveAction(userId);
      if (res.ok) {
        toast({ title: isActive ? "Customer disabled" : "Customer enabled", variant: "success" });
        router.refresh();
      } else {
        toast({ title: "Update failed", variant: "error", description: res.error });
      }
    });
  }

  return (
    <Button size="sm" variant={isActive ? "outline" : "default"} onClick={run} disabled={pending}>
      {pending ? "…" : isActive ? "Disable" : "Enable"}
    </Button>
  );
}
