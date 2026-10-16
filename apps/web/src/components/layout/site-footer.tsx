import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-semibold">Fresh Basket</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Daily essentials, delivered fresh. Home delivery slots and store pickup.
          </p>
        </div>
        <div>
          <p className="font-medium">Shop</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              <Link href="/shop">All products</Link>
            </li>
            <li>
              <Link href="/account/orders">Track order</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium">Support</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>hello@grocery.test</li>
            <li>+91 98765 43210</li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fresh Basket. All rights reserved.
      </div>
    </footer>
  );
}
