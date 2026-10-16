import { prisma } from "database";
import { CategoriesManager } from "./_components/categories-manager";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count.products,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organise products into a browsable category tree.
        </p>
      </div>
      <CategoriesManager categories={rows} />
    </div>
  );
}
