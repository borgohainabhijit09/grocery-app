"use server";

import { AuthError } from "next-auth";
import { prisma } from "database";
import { loginSchema } from "shared";
import { signIn, signOut } from "@/auth";

export type AdminActionResult = { error?: string; success?: boolean; redirectTo?: string };

const PANEL_ROLES = ["ADMIN", "STAFF", "DELIVERY"];

export async function staffLoginAction(
  _prev: AdminActionResult | undefined,
  formData: FormData
): Promise<AdminActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive || !PANEL_ROLES.includes(user.role)) {
    await signOut({ redirect: false });
    return { error: "You do not have access to the admin panel." };
  }

  return {
    success: true,
    redirectTo: user.role === "DELIVERY" ? "/delivery" : "/admin",
  };
}
