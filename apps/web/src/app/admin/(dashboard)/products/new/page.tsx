import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "database";
import { ProductForm } from "../_components/product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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
        <h1 className="text-2xl font-semibold">New product</h1>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
