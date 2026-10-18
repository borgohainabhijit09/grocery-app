import Image from "next/image";
import Link from "next/link";

type PromoCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export function PromoTiles({ categories }: { categories: PromoCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Shop by need</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Curated picks to fill your basket faster
          </p>
        </div>
        <Link href="/shop" className="text-sm font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group relative isolate flex h-40 flex-col overflow-hidden rounded-2xl border shadow-sm sm:h-48"
          >
            {c.image ? (
              <Image
                src={c.image}
                alt={c.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-900"
              />
            )}
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
            />
            <div className="relative z-10 mt-auto p-5 text-white">
              <h3 className="text-lg font-bold drop-shadow-sm">{c.name}</h3>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-white/90 group-hover:underline">
                Shop now →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
