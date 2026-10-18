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

/** Parse a rupee string like "123.45" into paise (12345). */
export function rupeesToPaise(value: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Render paise as a plain rupee number string for editing, e.g. 12345 -> "123.45". */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
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

export const NOTIFICATION_STATUS_COLORS: Record<string, string> = {
  QUEUED: "#d97706",
  SENT: "#16a34a",
  FAILED: "#dc2626",
};

/** Forward transitions allowed by the shared order status flow. */
export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];
