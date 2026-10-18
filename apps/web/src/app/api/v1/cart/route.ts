import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { addToCartSchema, updateCartItemSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeCartItem } from "@/lib/api-serialize";

const updateSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(99),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
}

async function cartPayload(userId: string) {
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

export const GET = route(async (request) => {
  const me = await requireApiUser(request);
  return NextResponse.json(await cartPayload(me.id));
});

/** Add a variant to the cart (increments when already present). */
export const POST = route(async (request) => {
  const me = await requireApiUser(request);
  const { variantId, quantity } = await parseBody(addToCartSchema, request);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || !variant.isActive) throw new ApiError(400, "This product is unavailable.");
  if (variant.stockQty <= 0) throw new ApiError(400, "This product is out of stock.");

  const cart = await ensureCart(me.id);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });

  const desired = (existing?.quantity ?? 0) + quantity;
  const nextQty = Math.max(1, Math.min(desired, 99, variant.stockQty));

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity: nextQty },
    create: { cartId: cart.id, variantId: variant.id, quantity: nextQty },
  });

  return NextResponse.json(await cartPayload(me.id));
});

/** Update quantity (0 removes the line). */
export const PATCH = route(async (request) => {
  const me = await requireApiUser(request);
  const body = await parseBody(updateSchema, request);
  const parsed = updateCartItemSchema.safeParse({ quantity: body.quantity });
  if (!parsed.success) throw new ApiError(422, "Invalid quantity.");

  const cart = await ensureCart(me.id);
  if (parsed.data.quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId: body.variantId } });
  } else {
    await prisma.cartItem.updateMany({
      where: { cartId: cart.id, variantId: body.variantId },
      data: { quantity: parsed.data.quantity },
    });
  }

  return NextResponse.json(await cartPayload(me.id));
});

/** Remove one line (?variantId=) or clear the cart (?all=1). */
export const DELETE = route(async (request) => {
  const me = await requireApiUser(request);
  const sp = new URL(request.url).searchParams;
  const cart = await ensureCart(me.id);

  if (["1", "true", "on"].includes(sp.get("all") ?? "")) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return NextResponse.json(await cartPayload(me.id));
  }

  const variantId = sp.get("variantId");
  if (!variantId) throw new ApiError(400, "variantId or all=1 is required.");
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  return NextResponse.json(await cartPayload(me.id));
});
