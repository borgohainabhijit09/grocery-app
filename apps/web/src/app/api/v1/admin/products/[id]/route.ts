import { NextResponse } from "next/server";
import { prisma } from "database";
import { productInputSchema } from "shared";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminProduct } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } }, variants: true },
  });
  if (!product) throw NOT_FOUND("Product");

  return NextResponse.json({ product: serializeAdminProduct(product) });
});

export const PATCH = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;
  const d = await parseBody(productInputSchema, request);

  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) throw NOT_FOUND("Product");

  const slug = d.slug?.trim() || existing.slug;
  const conflict = await prisma.product.findFirst({ where: { slug, NOT: { id } } });
  if (conflict) throw new ApiError(409, "Slug already in use.", { slug: ["Already in use"] });

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
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
      },
    });

    const keptIds = new Set(d.variants.filter((v) => v.id).map((v) => v.id as string));

    for (const v of d.variants) {
      const payload = {
        label: v.label,
        pricePaise: v.pricePaise,
        mrpPaise: v.mrpPaise ?? null,
        stockQty: v.stockQty,
        sku: v.sku?.trim() || null,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: payload });
      } else {
        await tx.productVariant.create({ data: { ...payload, productId: id } });
      }
    }

    const toDeactivate = existing.variants.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
    if (toDeactivate.length > 0) {
      await tx.productVariant.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
    }
  });

  return NextResponse.json({ ok: true, id });
});

export const DELETE = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
