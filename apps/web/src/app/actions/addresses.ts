"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { addressSchema, type AddressInput } from "shared";
import { auth } from "@/auth";
import { fieldErrorsFrom, toDbError, type FormState } from "@/lib/action-result";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function upsertAddressAction(
  _prev: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const userId = await requireUserId();
  const id = (formData.get("id") as string | null)?.trim() || undefined;

  const parsed = addressSchema.safeParse({
    label: formData.get("label") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    pincode: formData.get("pincode") ?? "",
    latitude: Number(formData.get("latitude") ?? 0),
    longitude: Number(formData.get("longitude") ?? 0),
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data as AddressInput;

  try {
    if (id) {
      const existing = await prisma.address.findUnique({ where: { id, userId } });
      if (!existing) return { error: "Address not found." };

      if (data.isDefault) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await prisma.address.update({
        where: { id },
        data: {
          label: data.label || null,
          fullName: data.fullName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          latitude: data.latitude,
          longitude: data.longitude,
          isDefault: data.isDefault,
        },
      });
    } else {
      if (data.isDefault) {
        await prisma.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await prisma.address.create({
        data: {
          userId,
          label: data.label || null,
          fullName: data.fullName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          latitude: data.latitude,
          longitude: data.longitude,
          isDefault: data.isDefault,
        },
      });
    }

    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

export async function setDefaultAddressAction(id: string): Promise<FormState> {
  const userId = await requireUserId();
  try {
    const addr = await prisma.address.findUnique({ where: { id, userId } });
    if (!addr) return { error: "Address not found." };

    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
      prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);

    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}

export async function deleteAddressAction(id: string): Promise<FormState> {
  const userId = await requireUserId();
  try {
    await prisma.address.delete({ where: { id, userId } });
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (err) {
    return toDbError(err);
  }
}
