import { NextResponse } from "next/server";
import { prisma } from "database";
import { categoryInputSchema, slugify } from "shared";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";
import { serializeAdminCategory } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All categories (incl. inactive) with product/child counts. */
export const GET = route(async (request) => {
  await requireStaffApi(request);

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });

  return NextResponse.json({ items: categories.map(serializeAdminCategory) });
});

export const POST = route(async (request) => {
  await requireStaffApi(request);
  const data = await parseBody(categoryInputSchema, request);

  const slug = data.slug?.trim() || slugify(data.name);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) throw new ApiError(409, "Slug already in use.", { slug: ["Already in use"] });

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      image: data.image || null,
      parentId: data.parentId || null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ id: category.id }, { status: 201 });
});
