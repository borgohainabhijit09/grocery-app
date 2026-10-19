import Link from "next/link";
import { LogOut, User, Search } from "lucide-react";
import { prisma } from "database";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { HeaderSearch } from "@/components/shop/header-search";
import { CartDrawer } from "@/components/cart-drawer";
import { ThemeToggle } from "@/components/theme-provider";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export async function SiteHeader() {
  const session = await auth();

  let cartCount = 0;
  if (session?.user?.id) {
    try {
      cartCount = await prisma.cartItem.count({
        where: { cart: { userId: session.user.id } },
      });
    } catch {
      cartCount = 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            🥬
          </span>
          <span className="hidden text-lg sm:inline">Fresh Basket</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/shop">Shop</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/orders">My Orders</Link>
          </Button>
        </nav>

        <HeaderSearch className="mx-auto hidden w-full max-w-md md:block" />

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm" className="md:hidden">
            <Link href="/shop" aria-label="Search products">
              <Search className="size-4" />
            </Link>
          </Button>

          <ThemeToggle />

          <CartDrawer cartCount={cartCount} isLoggedIn={!!session?.user} />

          {session?.user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">
                  <User className="size-4" />
                  <span className="hidden sm:inline">My Account</span>
                </Link>
              </Button>
              <form action={logout}>
                <Button variant="ghost" size="icon-sm" type="submit" aria-label="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border-t lg:hidden">
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5">
          <Button asChild variant="ghost" size="sm">
            <Link href="/shop">Shop</Link>
          </Button>
          {session?.user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account/orders">My Orders</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/account">My Account</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
