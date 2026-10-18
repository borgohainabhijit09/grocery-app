import { NextResponse } from "next/server";
import { prisma } from "database";
import { route } from "@/lib/api-helpers";
import { serializeCategory } from "@/lib/api-serialize";
import { getCategoryTree } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Active categories: flat list (with product counts) + nested tree. */
export const GET = route(async () => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  const tree = await getCategoryTree();

  return NextResponse.json({ items: rows.map(serializeCategory), tree });
});
