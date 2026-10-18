"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Package, Search, Tag, TrendingUp } from "lucide-react";
import { formatINR } from "shared";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  image: string | null;
  pricePaise: number;
  inStock: boolean;
};

type CategorySuggestion = { name: string; slug: string };

const RECENT_KEY = "fb:recent-searches";
const MAX_RECENT = 6;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string): string[] {
  const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
  return next;
}

export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<CategorySuggestion[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const q = value.trim();

  const go = useCallback(
    (href: string, term?: string) => {
      if (term) setRecent(saveRecent(term));
      setOpen(false);
      setValue("");
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/products/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          products: Suggestion[];
          categories: CategorySuggestion[];
          terms: string[];
        };
        setProducts(data.products);
        setCategories(data.categories);
        setTerms(data.terms);
      } catch {
        /* aborted or network */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    go(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop", q || undefined);
  }

  const showPanel = open;
  const hasResults = products.length > 0 || categories.length > 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={submit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search groceries…"
          className="pl-9"
          aria-label="Search products"
        />
      </form>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border bg-popover p-2 shadow-lg">
          {loading && !hasResults ? (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </p>
          ) : null}

          {q.length < 2 ? (
            <>
              {recent.length > 0 ? (
                <Section title="Recent">
                  {recent.map((term) => (
                    <button
                      key={`recent-${term}`}
                      type="button"
                      onClick={() => go(`/shop?q=${encodeURIComponent(term)}`, term)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Clock className="size-4 text-muted-foreground" />
                      {term}
                    </button>
                  ))}
                </Section>
              ) : null}
              {terms.length > 0 ? (
                <Section title="Trending">
                  {terms.map((term) => (
                    <button
                      key={`term-${term}`}
                      type="button"
                      onClick={() => go(`/shop?q=${encodeURIComponent(term)}`, term)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <TrendingUp className="size-4 text-muted-foreground" />
                      {term}
                    </button>
                  ))}
                </Section>
              ) : null}
              {recent.length === 0 && terms.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Start typing to search for products.
                </p>
              ) : null}
            </>
          ) : null}

          {q.length >= 2 && hasResults ? (
            <>
              {categories.length > 0 ? (
                <Section title="Categories">
                  {categories.map((c) => (
                    <button
                      key={`cat-${c.slug}`}
                      type="button"
                      onClick={() => go(`/category/${c.slug}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Tag className="size-4 text-muted-foreground" />
                      {c.name}
                    </button>
                  ))}
                </Section>
              ) : null}
              {products.length > 0 ? (
                <Section title="Products">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => go(`/product/${p.slug}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-md border bg-secondary">
                        {p.image ? (
                          <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center">
                            <Package className="size-4 text-muted-foreground" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        {p.unit ? (
                          <span className="block text-xs text-muted-foreground">{p.unit}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {p.inStock ? formatINR(p.pricePaise) : "Sold out"}
                      </span>
                    </button>
                  ))}
                </Section>
              ) : null}
            </>
          ) : null}

          {q.length >= 2 && !loading && !hasResults ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matches for “{q}”. Try another term.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b py-1.5 last:border-b-0">
      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
