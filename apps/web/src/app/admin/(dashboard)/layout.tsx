import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck, Store } from "lucide-react";

import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user) redirect("/admin/login");
  if (role !== "ADMIN" && role !== "STAFF") redirect("/");

  const initials = (session.user.name ?? session.user.email ?? "?")
    .toString()
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-secondary/20">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background/80 p-4 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </span>
          <span className="text-base leading-tight font-semibold">
            Fresh Basket
            <span className="block text-xs font-normal text-muted-foreground">Admin panel</span>
          </span>
        </Link>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <AdminNav />
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{session.user.name ?? "Admin"}</p>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" />
                {role === "ADMIN" ? "Administrator" : "Staff"}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/">
              <Store className="size-4" />
              View store
            </Link>
          </Button>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Link href="/admin" className="flex items-center gap-2 md:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-4" />
            </span>
            <span className="text-sm font-semibold">Fresh Basket</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground md:block">
            {session.user.name ?? "Admin"} · {role === "ADMIN" ? "Administrator" : "Staff"}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logout} className="md:hidden">
              <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        <nav className="scrollbar-thin flex gap-1 overflow-x-auto border-b bg-background p-2 md:hidden">
          <AdminNav variant="mobile" />
        </nav>

        <main className="min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
