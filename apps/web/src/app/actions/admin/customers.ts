"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { requireStaff } from "@/lib/auth-guard";
import { toDbError, type FormState } from "./_shared";

export async function toggleCustomerActiveAction(userId: string): Promise<FormState> {
  await requireStaff();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "CUSTOMER") return { error: "Customer not found." };

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${userId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
