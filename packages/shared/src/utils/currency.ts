/** Convert a rupee amount to integer paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert integer paise to a rupee number. */
export function toRupees(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format integer paise as an INR string, e.g. 250000 -> "₹2,500". */
export function formatINR(paise: number): string {
  return inrFormatter.format(paise / 100);
}

/** Percentage discount (0-100) given MRP and selling price in paise. */
export function discountPercent(mrpPaise: number, pricePaise: number): number {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}
