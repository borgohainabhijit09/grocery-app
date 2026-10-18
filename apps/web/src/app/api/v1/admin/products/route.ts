import { NextResponse } from "next/server";
import { prisma } from "database";
import { productInputSchema, slugify } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminProductRow } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin product list (all statuses) with optional search. */
export const GET = route(async (request) => {
  await requireStaffApi(request);
  const term = new URL(request.url).searchParams.get("q")?.trim();

  const products = await prisma.product.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
            { brand: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items: products.map(serializeAdminProductRow), total: products.length });
});

/** Create a product. */
export const POST = route(async (request) => {
  await requireStaffApi(request);
  const d = await parseBody(productInputSchema, request);

  const slug = d.slug?.trim() || slugify(d.name);
  const conflict = await prisma.product.findUnique({ where: { slug } });
  if (conflict) throw new ApiError(409, "Slug already in use.", { slug: ["Already in use"] });

  const product = await prisma.product.create({
    data: {
      name: d.name,
      slug,
      description: d.description || null,
      brand: d.brand || null,
      unit: d.unit || null,
      images: d.images,
      tags: d.tags,
      categoryId: d.categoryId,
      isActive: d.isActive,
      isFeatured: d.isFeatured,
      variants: {
        create: d.variants.map((v) => ({
          label: v.label,
          pricePaise: v.pricePaise,
          mrpPaise: v.mrpPaise ?? null,
          stockQty: v.stockQty,
          sku: v.sku?.trim() || null,
        })),
      },
    },
  });

  return NextResponse.json({ id: product.id }, { status: 201 });
});
