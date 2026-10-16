import Image from "next/image";
import Link from "next/link";
import { formatINR, discountPercent } from "shared";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  images: string[];
  variants: { id: string; pricePaise: number; mrpPaise: number | null; stockQty: number }[];
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const variant = product.variants[0];
  const price = variant?.pricePaise ?? 0;
  const mrp = variant?.mrpPaise ?? null;
  const off = mrp ? discountPercent(mrp, price) : 0;
  const inStock = (variant?.stockQty ?? 0) > 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl">🥦</div>
        )}
        {off > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {off}% off
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 grid place-items-center bg-background/70 text-sm font-medium">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        {product.unit && <p className="text-xs text-muted-foreground">{product.unit}</p>}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-semibold">{formatINR(price)}</span>
          {mrp && mrp > price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(mrp)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
