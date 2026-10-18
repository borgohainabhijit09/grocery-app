"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { subscribeStockAlert } from "@/lib/stock-alerts";

export type StockAlertFormState = { ok: boolean; error?: string };

const schema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullish(),
  productName: z.string().max(300).nullish(),
  email: z.string().email().max(320).nullish(),
});

/**
 * Subscribe the signed-in user (or a guest email) to a restock alert for a
 * product/variant. For signed-in users the account email is resolved on send,
 * so no email is required from the client.
 */
export async function notifyWhenBackInStockAction(
  input: unknown,
): Promise<StockAlertFormState> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const email = parsed.data.email?.trim().toLowerCase() || null;

  if (!userId && !email) {
    return { ok: false, error: "Enter your email so we can notify you." };
  }

  await subscribeStockAlert({
    productId: parsed.data.productId,
    variantId: parsed.data.variantId ?? null,
    productName: parsed.data.productName ?? null,
    email: userId ? null : email,
    userId,
  });

  return { ok: true };
}
