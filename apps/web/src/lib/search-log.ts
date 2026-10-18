import { prisma } from "database";

const WINDOW_MS = 60_000;
const recent = new Map<string, number>();

/**
 * Record a storefront search term (best-effort) so it can later surface as a
 * "trending" suggestion. Identical terms are throttled to one write per minute.
 */
export async function logSearch(term: string, userId?: string | null): Promise<void> {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return;

  const now = Date.now();
  const last = recent.get(q);
  if (last != null && now - last < WINDOW_MS) return;
  recent.set(q, now);

  try {
    await prisma.auditLog.create({
      data: { entity: "Search", action: "SEARCH", actorId: userId ?? null, diff: { q } },
    });
  } catch {
    /* logging is best-effort */
  }
}
