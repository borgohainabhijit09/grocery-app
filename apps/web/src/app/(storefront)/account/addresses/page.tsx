import { redirect } from "next/navigation";
import { prisma } from "database";
import { auth } from "@/auth";
import { AddressManager } from "@/components/account/address-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "My addresses" };

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <AddressManager addresses={addresses} />
    </div>
  );
}
