/** Convert arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Append a short random suffix to keep slugs unique. */
export function uniqueSlug(input: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(input)}-${suffix}`;
}
