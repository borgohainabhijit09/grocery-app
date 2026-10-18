import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountTabs } from "@/components/account/account-tabs";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">My account</h1>
      <AccountTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
