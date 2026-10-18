export type StockState = "out" | "low" | "in";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/** Classify a variant's stock level against its low-stock threshold. */
export function stockState(stockQty: number, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD): StockState {
  if (stockQty <= 0) return "out";
  if (stockQty <= Math.max(1, lowStockThreshold)) return "low";
  return "in";
}

/** Short customer-facing label for a stock state. */
export function stockLabel(
  stockQty: number,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
): string {
  switch (stockState(stockQty, lowStockThreshold)) {
    case "out":
      return "Out of stock";
    case "low":
      return `Only ${stockQty} left`;
    default:
      return "In stock";
  }
}
