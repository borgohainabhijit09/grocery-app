"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { addToCartSchema } from "shared";
import { auth } from "@/auth";
import { reorderIntoCart } from "@/lib/cart-service";

export type CartActionResult = { ok?: boolean; error?: string };

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function ensureCart(userId: string) {
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return null;
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

const STALE_SESSION_ERROR = "Session expired. Please sign out and sign in again.";

export async function addToCartAction(input: {
  variantId: string;
  quantity: number;
}): Promise<CartActionResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid item." };

  const userId = await currentUserId();
  if (!userId) return { error: "Please log in to add items to your cart." };

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
  });
  if (!variant || !variant.isActive) return { error: "This product is unavailable." };
  if (variant.stockQty <= 0) return { error: "This product is out of stock." };

  const cart = await ensureCart(userId);
  if (!cart) return { error: STALE_SESSION_ERROR };
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });

  const desired = (existing?.quantity ?? 0) + parsed.data.quantity;
  const quantity = Math.max(1, Math.min(desired, 99, variant.stockQty));

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity },
    create: { cartId: cart.id, variantId: variant.id, quantity },
  });

  revalidatePath("/cart");
  return { ok: true };
}

export async function updateCartItemAction(input: {
  variantId: string;
  quantity: number;
}): Promise<CartActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please log in." };

  const cart = await ensureCart(userId);
  if (!cart) return { error: STALE_SESSION_ERROR };
  const quantity = Math.max(0, Math.min(99, Math.floor(input.quantity)));

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId: input.variantId } });
  } else {
    await prisma.cartItem.updateMany({
      where: { cartId: cart.id, variantId: input.variantId },
      data: { quantity },
    });
  }

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItemAction(variantId: string): Promise<CartActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please log in." };

  const cart = await ensureCart(userId);
  if (!cart) return { error: STALE_SESSION_ERROR };
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });

  revalidatePath("/cart");
  return { ok: true };
}

export type ReorderResult = {
  ok?: boolean;
  error?: string;
  added?: number;
  skipped?: number;
};

/** Add every still-available item from a past order back into the cart. */
export async function reorderAction(orderId: string): Promise<ReorderResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please log in." };

  const result = await reorderIntoCart(userId, orderId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/cart");
  return { ok: true, added: result.added, skipped: result.skipped };
}
