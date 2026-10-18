import { formatINR, ORDER_STATUS_LABELS, type OrderStatus } from "shared";

export type OrderContext = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  totalPaise: number;
  itemCount: number;
  slotLabel?: string | null;
  customerName?: string | null;
  partnerName?: string | null;
};

export type RenderContext = {
  template: string;
  recipientName?: string | null;
  storeName?: string;
  contactPhone?: string;
  payload: Record<string, unknown>;
  order?: OrderContext | null;
  /** Absolute URL the customer should open (order tracking or delivery portal). */
  link: string;
};

export type RenderedNotification = {
  subject: string;
  html: string;
  text: string;
};

const SUBJECTS: Record<string, (o?: OrderContext | null) => string> = {
  order_placed: (o) => `Order ${o?.orderNumber ?? ""} received`,
  order_confirmed: (o) => `Order ${o?.orderNumber ?? ""} confirmed`,
  order_packed: (o) => `Order ${o?.orderNumber ?? ""} is packed`,
  order_out_for_delivery: (o) => `Order ${o?.orderNumber ?? ""} is out for delivery`,
  order_ready_for_pickup: (o) => `Your order ${o?.orderNumber ?? ""} is ready for pickup`,
  order_completed: (o) => `Order ${o?.orderNumber ?? ""} completed`,
  order_cancelled: (o) => `Order ${o?.orderNumber ?? ""} cancelled`,
  order_assigned: (o) => `Delivery assigned for order ${o?.orderNumber ?? ""}`,
  order_status_changed: (o) => `Order ${o?.orderNumber ?? ""} — ${o?.statusLabel ?? "updated"}`,
  back_in_stock: () => "An item on your list is back in stock",
};

const COPY: Record<string, { heading: string; body: string }> = {
  order_placed: { heading: "We received your order", body: "Thanks for shopping with us. We will start preparing it right away." },
  order_confirmed: { heading: "Your order is confirmed", body: "We have confirmed your order and it will be packed shortly." },
  order_packed: { heading: "Your order is packed", body: "Packing is complete. It will be handed over for delivery or pickup soon." },
  order_out_for_delivery: { heading: "Your order is on the way", body: "Our delivery partner has picked up your order and is heading to you." },
  order_ready_for_pickup: { heading: "Your order is ready for pickup", body: "Please collect your order from the store during your chosen slot." },
  order_completed: { heading: "Order completed", body: "Thank you — we hope you enjoyed your order." },
  order_cancelled: { heading: "Order cancelled", body: "Your order has been cancelled. If you paid online, any refund will be processed shortly." },
  order_assigned: { heading: "New delivery assigned", body: "A new delivery has been assigned to you. Open the partner portal for details." },
  order_status_changed: { heading: "Order update", body: "There is a new update on your order." },
  back_in_stock: { heading: "Back in stock", body: "Good news — an item you asked about is available again. Order now before it sells out." },
};

export type RenderedPush = {
  title: string;
  body: string;
};

/** Compact title/body for a device push notification. */
export function renderPush(ctx: RenderContext): RenderedPush {
  const { template, order } = ctx;
  const copy =
    COPY[template] ?? { heading: "Order update", body: "There is a new update on your order." };
  const title = (SUBJECTS[template] ?? ((o) => `Update for order ${o?.orderNumber ?? ""}`))(order);
  const suffix = order ? ` Order ${order.orderNumber} · ${order.statusLabel || ""}`.trimEnd() : "";
  const product =
    typeof ctx.payload.productName === "string" && ctx.payload.productName
      ? ` ${ctx.payload.productName}`
      : "";
  return { title, body: `${copy.body}${suffix}${product}` };
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderNotification(ctx: RenderContext): RenderedNotification {
  const { template, order, payload } = ctx;
  const copy = COPY[template] ?? { heading: "Order update", body: "There is a new update on your order." };
  const subject = (SUBJECTS[template] ?? ((o) => `Update for order ${o?.orderNumber ?? ""}`))(order);

  const storeName = ctx.storeName || "Fresh Basket";
  const greeting = ctx.recipientName ? `Hi ${ctx.recipientName},` : "Hello,";
  const lines: string[] = [greeting, "", copy.body];

  if (order) {
    lines.push(
      "",
      `Order: ${order.orderNumber}`,
      `Status: ${order.statusLabel || ORDER_STATUS_LABELS[order.status]}`,
      `Items: ${order.itemCount}`,
      `Total: ${formatINR(order.totalPaise)}`,
      `Fulfillment: ${order.fulfillmentType === "DELIVERY" ? "Home delivery" : "Store pickup"}`
    );
    if (order.slotLabel) lines.push(`Slot: ${order.slotLabel}`);
    if (order.partnerName) lines.push(`Delivery partner: ${order.partnerName}`);
  }

  if (typeof payload.productName === "string" && payload.productName) {
    lines.push("", `Item: ${payload.productName}`);
  }
  if (typeof payload.reason === "string" && payload.reason) {
    lines.push("", `Reason: ${payload.reason}`);
  }
  if (typeof payload.note === "string" && payload.note) {
    lines.push("", `Note: ${payload.note}`);
  }

  lines.push("", "You can view the full details here:", ctx.link);
  if (ctx.contactPhone) lines.push("", `Need help? Call ${ctx.contactPhone}.`);

  const text = [`${storeName} — ${copy.heading}`, "", ...lines].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111827">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td style="font-size:18px;font-weight:bold;padding-bottom:8px">${esc(storeName)}</td></tr>
          <tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${esc(copy.heading)}</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px">${lines
            .map((l) => esc(l))
            .join("<br/>")}</td></tr>
          <tr><td style="padding-top:8px">
            <a href="${esc(ctx.link)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">${esc(
              template === "order_assigned"
                ? "Open partner portal"
                : template === "back_in_stock"
                  ? "View item"
                  : "Track your order"
            )}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
