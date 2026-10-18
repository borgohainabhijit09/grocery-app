import { NextResponse } from "next/server";
import { prisma } from "database";
import { categoryInputSchema, slugify } from "shared";
import { ApiError, NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;
  const data = await parseBody(categoryInputSchema, request);

  const slug = data.slug?.trim() || slugify(data.name);
  const conflict = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
  if (conflict) throw new ApiError(409, "Slug already in use.", { slug: ["Already in use"] });
  if (data.parentId === id) throw new ApiError(400, "A category cannot be its own parent.");

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw NOT_FOUND("Category");

  await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug,
      image: data.image || null,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ ok: true, id });
});

export const DELETE = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;

  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);

  if (products > 0) {
    throw new ApiError(409, `Cannot delete: ${products} product(s) use this category.`);
  }
  if (children > 0) {
    throw new ApiError(409, `Cannot delete: ${children} sub-category(ies) exist.`);
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
