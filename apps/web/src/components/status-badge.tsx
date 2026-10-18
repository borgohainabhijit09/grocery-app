import { ORDER_STATUS_LABELS, type OrderStatus } from "shared";

import { cn } from "@/lib/utils";

export type Tone =
  | "neutral"
  | "info"
  | "progress"
  | "purple"
  | "teal"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  muted: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ORDER_TONES: Record<OrderStatus, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PACKED: "progress",
  OUT_FOR_DELIVERY: "purple",
  READY_FOR_PICKUP: "teal",
  COMPLETED: "success",
  CANCELLED: "danger",
  REFUNDED: "muted",
};

const PAYMENT_TONES: Record<string, Tone> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "muted",
  CANCELLED: "muted",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

const NOTIFICATION_TONES: Record<string, Tone> = {
  QUEUED: "warning",
  SENT: "success",
  FAILED: "danger",
};

const NOTIFICATION_LABELS: Record<string, string> = {
  QUEUED: "Queued",
  SENT: "Sent",
  FAILED: "Failed",
};

export function StatusBadge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <StatusBadge tone={ORDER_TONES[status]} className={className}>
      {ORDER_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <StatusBadge tone={PAYMENT_TONES[status] ?? "muted"} className={className}>
      {PAYMENT_LABELS[status] ?? status}
    </StatusBadge>
  );
}

export function NotificationStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <StatusBadge tone={NOTIFICATION_TONES[status] ?? "neutral"} className={className}>
      {NOTIFICATION_LABELS[status] ?? status}
    </StatusBadge>
  );
}
