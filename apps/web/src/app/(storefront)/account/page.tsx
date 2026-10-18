import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "database";
import { LayoutDashboard } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/account/profile-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");

  const [user, orderCount, addressCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, phoneVerifiedAt: true, createdAt: true },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
    prisma.address.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{user?.name ?? session.user.name}</h2>
            <p className="text-sm text-muted-foreground">
              {user ? `Member since ${new Date(user.createdAt).toLocaleDateString("en-IN")}` : ""}
            </p>
          </div>
          {user?.phoneVerifiedAt ? (
            <Badge variant="success">Phone verified</Badge>
          ) : (
            <Badge variant="warning">Phone unverified</Badge>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-5">
        <h2 className="text-base font-semibold">Edit profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Update your name and contact number.
        </p>
        <ProfileForm
          name={user?.name ?? session.user.name ?? ""}
          phone={user?.phone ?? ""}
          email={user?.email ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-xl border p-4 transition-shadow hover:shadow-md"
        >
          <p className="text-2xl font-semibold">{orderCount}</p>
          <p className="text-sm text-muted-foreground">
            Order{orderCount === 1 ? "" : "s"} placed
          </p>
          <span className="mt-2 inline-block text-sm text-primary">View orders →</span>
        </Link>
        <Link
          href="/account/addresses"
          className="rounded-xl border p-4 transition-shadow hover:shadow-md"
        >
          <p className="text-2xl font-semibold">{addressCount}</p>
          <p className="text-sm text-muted-foreground">
            Saved address{addressCount === 1 ? "" : "es"}
          </p>
          <span className="mt-2 inline-block text-sm text-primary">Manage addresses →</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/shop">Continue shopping</Link>
        </Button>
        {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
          <Button asChild variant="outline">
            <Link href="/admin">
              <LayoutDashboard className="size-4" />
              Admin panel
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
