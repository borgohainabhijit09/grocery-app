import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type StaffUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
};

export async function requireStaff(): Promise<StaffUser> {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    redirect("/admin/login");
  }
  return user as StaffUser;
}

export async function requireAdmin(): Promise<StaffUser> {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/admin");
  return user as StaffUser;
}

/** Guard for the delivery partner portal (/delivery). */
export async function requireDelivery(): Promise<StaffUser> {
  const session = await auth();
  const user = session?.user;
  const role = user?.role;
  if (!user) redirect("/admin/login");
  if (role !== "DELIVERY" && role !== "ADMIN" && role !== "STAFF") redirect("/");
  return user as StaffUser;
}

export function isStaff(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "STAFF";
}
