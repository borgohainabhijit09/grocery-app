"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "database";
import { productInputSchema, slugify } from "shared";
import { requireStaff } from "@/lib/auth-guard";
import { fieldErrorsFrom, toDbError, type FormState } from "./_shared";

function revalidate() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function createProductAction(input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const d = parsed.data;
  const slug = d.slug?.trim() || slugify(d.name);

  const conflict = await prisma.product.findUnique({ where: { slug } });
  if (conflict) {
    return { ok: false, error: "Slug already in use.", fieldErrors: { slug: ["Already in use"] } };
  }

  try {
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
    revalidate();
    return { ok: true, id: product.id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function updateProductAction(id: string, input: unknown): Promise<FormState> {
  await requireStaff();

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const d = parsed.data;
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!existing) return { ok: false, error: "Product not found." };

  const slug = d.slug?.trim() || existing.slug;
  const conflict = await prisma.product.findFirst({ where: { slug, NOT: { id } } });
  if (conflict) {
    return { ok: false, error: "Slug already in use.", fieldErrors: { slug: ["Already in use"] } };
  }

  try {
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

      const toDeactivate = existing.variants
        .filter((v) => !keptIds.has(v.id))
        .map((v) => v.id);
      if (toDeactivate.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: toDeactivate } },
          data: { isActive: false },
        });
      }
    });
    revalidate();
    return { ok: true, id };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function deleteProductAction(id: string): Promise<FormState> {
  await requireStaff();
  try {
    await prisma.product.delete({ where: { id } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}

export async function toggleProductAction(
  id: string,
  field: "isActive" | "isFeatured",
  value: boolean
): Promise<FormState> {
  await requireStaff();
  try {
    await prisma.product.update({ where: { id }, data: { [field]: value } });
    revalidate();
    return { ok: true };
  } catch (err) {
    return { ok: false, ...toDbError(err) };
  }
}
