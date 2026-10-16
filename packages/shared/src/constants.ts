export const ROLES = ["CUSTOMER", "STAFF", "ADMIN", "DELIVERY"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  STAFF: "Staff",
  ADMIN: "Admin",
  DELIVERY: "Delivery partner",
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
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  READY_FOR_PICKUP: "Ready for pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/**
 * Allowed forward transitions for the order lifecycle.
 * Delivery and pickup diverge after PACKED.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["QUEUED", "SENT", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_TEMPLATES = [
  "order_placed",
  "order_confirmed",
  "order_packed",
  "order_out_for_delivery",
  "order_ready_for_pickup",
  "order_completed",
  "order_cancelled",
  "order_assigned",
  "order_status_changed",
] as const;
export type NotificationTemplate = (typeof NOTIFICATION_TEMPLATES)[number];

export const NOTIFICATION_TEMPLATE_LABELS: Record<NotificationTemplate, string> = {
  order_placed: "Order placed",
  order_confirmed: "Order confirmed",
  order_packed: "Order packed",
  order_out_for_delivery: "Out for delivery",
  order_ready_for_pickup: "Ready for pickup",
  order_completed: "Order completed",
  order_cancelled: "Order cancelled",
  order_assigned: "Delivery assigned",
  order_status_changed: "Status updated",
};

export const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["RAZORPAY", "COD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FULFILLMENT_TYPES = ["DELIVERY", "PICKUP"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const COUPON_TYPES = ["PERCENT", "FLAT"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const DEFAULT_SETTINGS = {
  deliveryFeePaise: 3000,
  freeDeliveryAbovePaise: 50000,
  minOrderValuePaise: 10000,
  deliveryRadiusKm: 10,
  taxRatePercent: 0,
  gstEnabled: false,
  currency: "INR",
  locale: "en-IN",
} as const;
