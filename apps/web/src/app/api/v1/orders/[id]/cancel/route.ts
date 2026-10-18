import { NextResponse } from "next/server";
import { cancelOrderSchema } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { cancelOrder } from "@/lib/order-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Cancel an order. */
export const POST = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;
  const input = await parseBody(cancelOrderSchema, request);

  const result = await cancelOrder(me.id, id, input.reason);
  if (!result.ok) throw new ApiError(400, result.error);

  return NextResponse.json({ ok: true });
});
