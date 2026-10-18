import { NextResponse } from "next/server";
import { prisma } from "database";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export type CartLine = {
  id: string;
  variantId: string;
  quantity: number;
  maxQty: number;
  pricePaise: number;
  lineTotalPaise: number;
  label: string;
  name: string;
  slug: string;
  image: string | null;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ loggedIn: false, items: [] as CartLine[] });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { variant: { include: { product: true } } },
      },
    },
  });

  const items: CartLine[] = (cart?.items ?? []).map((it) => ({
    id: it.id,
    variantId: it.variantId,
    quantity: it.quantity,
    maxQty: Math.max(1, Math.min(99, it.variant.stockQty)),
    pricePaise: it.variant.pricePaise,
    lineTotalPaise: it.variant.pricePaise * it.quantity,
    label: it.variant.label,
    name: it.variant.product.name,
    slug: it.variant.product.slug,
    image: it.variant.product.images[0] ?? null,
  }));

  return NextResponse.json({ loggedIn: true, items });
}
