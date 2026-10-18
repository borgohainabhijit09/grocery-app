import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { serializeProduct } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public product detail by slug. */
export const GET = route(async (_request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: { where: { isActive: true }, orderBy: { pricePaise: "asc" } },
    },
  });

  if (!product || !product.isActive) throw NOT_FOUND("Product");

  return NextResponse.json({ product: serializeProduct(product) });
});
