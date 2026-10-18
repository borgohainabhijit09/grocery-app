"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { updateProfileSchema } from "shared";
import { auth } from "@/auth";
import { fieldErrorsFrom, toDbError, type FormState } from "@/lib/action-result";

export async function updateProfileAction(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Please log in to update your profile." };

  const parsed = updateProfileSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const { name, phone } = parsed.data;

  if (phone) {
    const clash = await prisma.user.findFirst({
      where: { phone, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (clash) {
      return {
        error: "That phone number is already in use.",
        fieldErrors: { phone: ["This number is already registered."] },
      };
    }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
      },
    });
  } catch (err) {
    return toDbError(err);
  }

  revalidatePath("/account");
  return { ok: true };
}
