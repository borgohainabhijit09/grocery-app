import { discountPercent } from "shared";
import { serializeVariant, type VariantLike } from "./api-serialize";

/* ---------- Products ---------- */

export type AdminProductLike = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  unit: string | null;
  images: string[];
  tags: string[];
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: (VariantLike & { lowStockThreshold: number })[];
  category?: { id: string; name: string; slug: string } | null;
};

/** Full product incl. deactivated variants (for the admin editor). */
export function serializeAdminProduct(p: AdminProductLike) {
  const prices = p.variants.map((v) => v.pricePaise);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    brand: p.brand,
    unit: p.unit,
    images: p.images,
    tags: p.tags,
    categoryId: p.categoryId,
    category: p.category ?? null,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    variantCount: p.variants.length,
    minPricePaise: prices.length ? Math.min(...prices) : 0,
    maxPricePaise: prices.length ? Math.max(...prices) : 0,
    totalStock: p.variants.reduce((sum, v) => sum + v.stockQty, 0),
    variants: p.variants.map(serializeVariant),
  };
}

export type AdminProductRowLike = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  category: { name: string };
  variants: { pricePaise: number; stockQty: number }[];
};

/** Compact product row for admin lists. */
export function serializeAdminProductRow(p: AdminProductRowLike) {
  const prices = p.variants.map((v) => v.pricePaise);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0] ?? null,
    categoryName: p.category.name,
    variantCount: p.variants.length,
    minPricePaise: prices.length ? Math.min(...prices) : 0,
    maxPricePaise: prices.length ? Math.max(...prices) : 0,
    discountPercent: prices.length
      ? discountPercent(0, Math.min(...prices))
      : 0,
    stock: p.variants.reduce((sum, v) => sum + v.stockQty, 0),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
  };
}

/* ---------- Categories ---------- */

export type AdminCategoryLike = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number; children?: number };
};

export function serializeAdminCategory(c: AdminCategoryLike) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count?.products ?? 0,
    childCount: c._count?.children ?? 0,
  };
}

/* ---------- Customers ---------- */

export type AdminUserLike = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
  _count?: { orders: number };
};

export function serializeAdminCustomer(u: AdminUserLike, spendPaise = 0) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    phoneVerified: Boolean(u.phoneVerifiedAt),
    orderCount: u._count?.orders ?? 0,
    spendPaise,
    createdAt: u.createdAt.toISOString(),
  };
}

/* ---------- Delivery partners ---------- */

export function serializeDeliveryPartner(
  u: { id: string; name: string; email: string; phone: string | null; isActive: boolean },
  openOrders = 0
) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    openOrders,
  };
}

/* ---------- Notifications ---------- */

export type NotificationLike = {
  id: string;
  userId: string | null;
  channel: string;
  status: string;
  template: string;
  payload: unknown;
  attempts: number;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

export type AdminCouponLike = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

/** Full coupon incl. a computed lifecycle status for the admin console. */
export function serializeAdminCoupon(c: AdminCouponLike) {
  const now = Date.now();
  const expiresAt = c.expiresAt ? c.expiresAt.getTime() : null;
  const status = !c.isActive
    ? "INACTIVE"
    : expiresAt != null && expiresAt < now
      ? "EXPIRED"
      : c.startsAt.getTime() > now
        ? "SCHEDULED"
        : c.maxUses != null && c.usedCount >= c.maxUses
          ? "EXHAUSTED"
          : "ACTIVE";
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    minOrderPaise: c.minOrderPaise,
    maxDiscountPaise: c.maxDiscountPaise,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive,
    status,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Minimal coupon shape safe to show to customers. */
export function serializePublicCoupon(c: {
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  expiresAt: Date | null;
}) {
  return {
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    minOrderPaise: c.minOrderPaise,
    maxDiscountPaise: c.maxDiscountPaise,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
  };
}

/* ---------- Notifications ---------- */

export function serializeNotification(n: NotificationLike, recipientEmail?: string | null) {
  const payload = (n.payload ?? {}) as Record<string, unknown>;
  const recipient =
    recipientEmail ?? (typeof payload.email === "string" ? payload.email : null);
  return {
    id: n.id,
    userId: n.userId,
    channel: n.channel,
    status: n.status,
    template: n.template,
    orderNumber: typeof payload.orderNumber === "string" ? payload.orderNumber : null,
    recipient,
    attempts: n.attempts,
    error: n.error,
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}
