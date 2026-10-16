import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingBag,
  Users,
  Settings,
  Store,
  Truck,
  Bell,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/admin/login" });
}

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/delivery", label: "Delivery partners", icon: Truck },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user) redirect("/admin/login");
  if (role !== "ADMIN" && role !== "STAFF") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-secondary/30 p-4 md:flex">
        <Link href="/admin" className="mb-6 px-2 text-lg font-semibold">
          Fresh Basket
          <span className="block text-xs font-normal text-muted-foreground">Admin panel</span>
        </Link>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 pt-4">
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

      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-sm text-muted-foreground">
            Signed in as {session.user.name} ({role})
          </span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
