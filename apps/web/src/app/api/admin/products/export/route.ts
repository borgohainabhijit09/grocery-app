import { auth } from "@/auth";
import { prisma } from "database";
import { toRupees } from "shared";

export const runtime = "nodejs";

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "STAFF")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { name: "asc" },
  });

  const header = [
    "Product",
    "Slug",
    "Category",
    "Brand",
    "Unit",
    "Variant",
    "Price",
    "MRP",
    "Stock",
    "SKU",
    "Active",
    "Featured",
  ];

  const lines: string[] = [header.join(",")];

  for (const p of products) {
    const variants = p.variants.length ? p.variants : [null];
    for (const v of variants) {
      lines.push(
        [
          p.name,
          p.slug,
          p.category.name,
          p.brand ?? "",
          p.unit ?? "",
          v?.label ?? "",
          v ? toRupees(v.pricePaise) : "",
          v?.mrpPaise != null ? toRupees(v.mrpPaise) : "",
          v?.stockQty ?? "",
          v?.sku ?? "",
          p.isActive ? "yes" : "no",
          p.isFeatured ? "yes" : "no",
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  const csv = lines.join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${date}.csv"`,
    },
  });
}
