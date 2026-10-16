"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "database";
import { loginSchema, registerSchema } from "shared";
import { signIn, signOut } from "@/auth";

export type ActionResult = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function signupAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true },
  });
  if (existing) {
    return { error: "An account with this email or phone already exists." };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, phone, password: hashed, role: "CUSTOMER" },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created. Please log in." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
