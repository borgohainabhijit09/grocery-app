export const ORDER_NUMBER_PREFIX = "GRC";

/** Generate a human-friendly order number, e.g. GRC-20261015-8F3K2. */
export function generateOrderNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${ORDER_NUMBER_PREFIX}-${y}${m}${d}-${rand}`;
}
