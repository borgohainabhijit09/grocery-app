"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { categoryInputSchema, slugify } from "shared";
import { requireStaff } from "@/lib/auth-guard";
import { fieldErrorsFrom, toDbError, type FormState } from "./_shared";

function revalidate() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function createCategoryAction(input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const slug = data.slug?.trim() || slugify(data.name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: "Slug already in use.", fieldErrors: { slug: ["Already in use"] } };
  }

  try {
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
    revalidate();
    return { ok: true, id: category.id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function updateCategoryAction(id: string, input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const data = parsed.data;
  const slug = data.slug?.trim() || slugify(data.name);

  const conflict = await prisma.category.findFirst({ where: { slug, NOT: { id } } });
  if (conflict) {
    return { ok: false, error: "Slug already in use.", fieldErrors: { slug: ["Already in use"] } };
  }

  if (data.parentId === id) {
    return { ok: false, error: "A category cannot be its own parent." };
  }

  try {
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
    revalidate();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  await requireStaff();

  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);

  if (products > 0) {
    return { ok: false, error: `Cannot delete: ${products} product(s) use this category.` };
  }
  if (children > 0) {
    return { ok: false, error: `Cannot delete: ${children} sub-category(ies) exist.` };
  }

  try {
    await prisma.category.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
