import Image from "next/image";
import Link from "next/link";
import { formatINR, discountPercent, stockState } from "shared";
import { QuickAdd } from "@/components/quick-add";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  images: string[];
  variants: {
    id: string;
    pricePaise: number;
    mrpPaise: number | null;
    stockQty: number;
    lowStockThreshold?: number;
  }[];
};

export function ProductCard({
  product,
  isLoggedIn = false,
  index = 0,
}: {
  product: ProductCardData;
  isLoggedIn?: boolean;
  index?: number;
}) {
  const variant = product.variants[0];
  const price = variant?.pricePaise ?? 0;
  const mrp = variant?.mrpPaise ?? null;
  const off = mrp ? discountPercent(mrp, price) : 0;
  const inStock = (variant?.stockQty ?? 0) > 0;
  const state = stockState(variant?.stockQty ?? 0, variant?.lowStockThreshold);

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      className="group flex animate-fade-up flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-secondary"
      >
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
        {state === "low" && (
          <span className="absolute bottom-2 left-2 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
            Only {variant?.stockQty} left
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-medium hover:text-primary"
        >
          {product.name}
        </Link>
        {product.unit && <p className="text-xs text-muted-foreground">{product.unit}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{formatINR(price)}</span>
            {mrp && mrp > price && (
              <span className="text-xs text-muted-foreground line-through">{formatINR(mrp)}</span>
            )}
          </div>
          <QuickAdd
            variantId={variant?.id ?? null}
            inStock={inStock}
            isLoggedIn={isLoggedIn}
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
