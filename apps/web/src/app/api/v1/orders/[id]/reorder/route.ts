import { NextResponse } from "next/server";
import { route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { cartPayload, reorderIntoCart } from "@/lib/cart-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Re-add a past order's available items to the cart. */
export const POST = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;

  const result = await reorderIntoCart(me.id, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, added: result.added, skipped: result.skipped }, { status: 400 });
  }

  const cart = await cartPayload(me.id);
  return NextResponse.json({ cart, added: result.added, skipped: result.skipped });
});
