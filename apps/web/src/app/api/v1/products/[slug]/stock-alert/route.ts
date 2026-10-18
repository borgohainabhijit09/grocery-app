import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { parseBody, route } from "@/lib/api-helpers";
import { subscribeStockAlert } from "@/lib/stock-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  variantId: z.string().min(1).nullish(),
  productName: z.string().max(300).nullish(),
  email: z.string().email().max(320).nullish(),
});

type Ctx = { params: Promise<{ slug: string }> };

/** Subscribe the signed-in user to a restock alert for a product/variant. */
export const POST = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { slug } = await ctx.params;
  const body = await parseBody(schema, request);

  await subscribeStockAlert({
    productId: slug,
    variantId: body.variantId ?? null,
    productName: body.productName ?? null,
    userId: me.id,
  });

  return NextResponse.json({ ok: true });
});
