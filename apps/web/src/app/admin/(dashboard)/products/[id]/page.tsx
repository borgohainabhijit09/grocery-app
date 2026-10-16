import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "database";
import { toRupees } from "shared";
import { ProductForm, type ProductFormData } from "../_components/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: true } }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  const data: ProductFormData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    brand: product.brand ?? "",
    unit: product.unit ?? "",
    categoryId: product.categoryId,
    images: product.images,
    tags: product.tags,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    variants: product.variants
      .filter((v) => v.isActive)
      .map((v) => ({
        id: v.id,
        label: v.label,
        price: String(toRupees(v.pricePaise)),
        mrp: v.mrpPaise != null ? String(toRupees(v.mrpPaise)) : "",
        stockQty: String(v.stockQty),
        sku: v.sku ?? "",
      })),
  };

  if (data.variants.length === 0) {
    data.variants = [{ label: "", price: "", mrp: "", stockQty: "0", sku: "" }];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
        <h1 className="text-2xl font-semibold">Edit product</h1>
      </div>
      <ProductForm categories={categories} product={data} />
    </div>
  );
}
