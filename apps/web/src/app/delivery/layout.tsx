import Link from "next/link";
import { LogOut, Truck } from "lucide-react";
import { signOut } from "@/auth";
import { requireDelivery } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

export default async function DeliveryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireDelivery();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/delivery" className="flex items-center gap-2 font-semibold">
          <Truck className="size-4" />
          Fresh Basket
          <span className="text-xs font-normal text-muted-foreground">Partner portal</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            Signed in as {user.name} ({user.role})
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-6">{children}</main>
    </div>
  );
}
