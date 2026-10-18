import { prisma } from "database";
import { serializeCartItem } from "@/lib/api-serialize";

/** Get the user's cart, creating it on first use. */
export async function ensureUserCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
}

/** Serializable cart contents for API/UI consumers. */
export async function cartPayload(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { variant: { include: { product: true } } },
      },
    },
  });

  const items = (cart?.items ?? []).map(serializeCartItem);
  const subtotalPaise = items.reduce((sum, it) => sum + it.lineTotalPaise, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);
  return { items, subtotalPaise, count };
}

export type ReorderOutcome = {
  ok: boolean;
  error?: string;
  added: number;
  skipped: number;
};

/**
 * Add every still-available variant from a past order into the user's cart,
 * merging quantities with what is already there (capped by stock and 99).
 */
export async function reorderIntoCart(userId: string, orderId: string): Promise<ReorderOutcome> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!order || order.userId !== userId) {
    return { ok: false, error: "Order not found.", added: 0, skipped: 0 };
  }

  const variantIds = [
    ...new Set(order.items.map((i) => i.variantId).filter((v): v is string => !!v)),
  ];
  if (!variantIds.length) {
    return { ok: false, error: "Nothing to reorder from this order.", added: 0, skipped: 0 };
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, isActive: true, stockQty: { gt: 0 } },
    select: { id: true, stockQty: true },
  });
  const stockById = new Map(variants.map((v) => [v.id, v.stockQty]));

  const cart = await ensureUserCart(userId);
  const existing = await prisma.cartItem.findMany({
    where: { cartId: cart.id, variantId: { in: variantIds } },
    select: { variantId: true, quantity: true },
  });
  const inCart = new Map(existing.map((c) => [c.variantId, c.quantity]));

  let added = 0;
  let skipped = 0;
  for (const item of order.items) {
    if (!item.variantId) {
      skipped++;
      continue;
    }
    const stock = stockById.get(item.variantId);
    if (stock == null) {
      skipped++;
      continue;
    }
    const desired = (inCart.get(item.variantId) ?? 0) + item.quantity;
    const quantity = Math.max(1, Math.min(desired, 99, stock));
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
      update: { quantity },
      create: { cartId: cart.id, variantId: item.variantId, quantity },
    });
    added++;
  }

  return { ok: true, added, skipped };
}
