/** Format paise as an Indian Rupee string, e.g. 12345 -> "₹123.45". */
export function formatINR(paise: number): string {
  const rupees = (paise ?? 0) / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  READY_FOR_PICKUP: "Ready for pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "#d97706",
  CONFIRMED: "#2563eb",
  PACKED: "#7c3aed",
  OUT_FOR_DELIVERY: "#0891b2",
  READY_FOR_PICKUP: "#0891b2",
  COMPLETED: "#16a34a",
  CANCELLED: "#dc2626",
  REFUNDED: "#64748b",
};
