import { discountPercent, DEFAULT_LOW_STOCK_THRESHOLD } from "shared";

/* ---------- Variants & products ---------- */

export type VariantLike = {
  id: string;
  label: string;
  pricePaise: number;
  mrpPaise: number | null;
  stockQty: number;
  lowStockThreshold?: number;
  sku?: string | null;
  isActive?: boolean;
};

export type ProductLike = {
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
  variants: VariantLike[];
  category?: { id: string; name: string; slug: string } | null;
};

export function serializeVariant(v: VariantLike) {
  return {
    id: v.id,
    label: v.label,
    pricePaise: v.pricePaise,
    mrpPaise: v.mrpPaise,
    stockQty: v.stockQty,
    inStock: v.stockQty > 0,
    lowStockThreshold: v.lowStockThreshold ?? 5,
    sku: v.sku ?? null,
    isActive: v.isActive ?? true,
  };
}

export function serializeProduct(p: ProductLike) {
  const active = p.variants.filter((v) => v.isActive !== false);
  const prices = active.map((v) => v.pricePaise);
  const pricePaise = prices.length ? Math.min(...prices) : 0;
  const first = active[0];
  const inStock = active.some((v) => v.stockQty > 0);
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
    pricePaise,
    mrpPaise: first?.mrpPaise ?? null,
    discountPercent: discountPercent(first?.mrpPaise ?? 0, pricePaise),
    inStock,
    variants: active.map(serializeVariant),
  };
}

export type ProductCardLike = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  images: string[];
  variants: {
    id: string;
    pricePaise: number;
    mrpPaise: number | null;
    stockQty: number;
    lowStockThreshold?: number;
  }[];
};

/** Compact product shape for list/grid views. */
export function serializeProductCard(p: ProductCardLike) {
  const sorted = [...p.variants].sort((a, b) => a.pricePaise - b.pricePaise);
  const first = sorted[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    unit: p.unit,
    image: p.images[0] ?? null,
    pricePaise: first?.pricePaise ?? 0,
    mrpPaise: first?.mrpPaise ?? null,
    discountPercent: discountPercent(first?.mrpPaise ?? 0, first?.pricePaise ?? 0),
    inStock: sorted.some((v) => v.stockQty > 0),
    variants: sorted.map((v) => ({
      id: v.id,
      pricePaise: v.pricePaise,
      mrpPaise: v.mrpPaise,
      stockQty: v.stockQty,
      lowStockThreshold: v.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      inStock: v.stockQty > 0,
    })),
  };
}

/* ---------- Categories ---------- */

export type CategoryLike = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

export function serializeCategory(c: CategoryLike) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count?.products ?? 0,
  };
}

/* ---------- Users ---------- */

export type UserLike = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  phoneVerifiedAt: Date | null;
  createdAt: Date;
};

export function serializeUser(u: UserLike) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    phoneVerified: Boolean(u.phoneVerifiedAt),
    createdAt: u.createdAt.toISOString(),
  };
}

/* ---------- Addresses ---------- */

export type AddressLike = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

export function serializeAddress(a: AddressLike) {
  return { ...a };
}

/* ---------- Cart ---------- */

export type CartItemLike = {
  id: string;
  variantId: string;
  quantity: number;
  variant: {
    label: string;
    pricePaise: number;
    mrpPaise: number | null;
    stockQty: number;
    product: { name: string; slug: string; unit: string | null; images: string[] };
  };
};

export function serializeCartItem(it: CartItemLike) {
  const maxQty = Math.max(1, Math.min(99, it.variant.stockQty));
  return {
    id: it.id,
    variantId: it.variantId,
    quantity: it.quantity,
    maxQty,
    inStock: it.variant.stockQty > 0,
    label: it.variant.label,
    name: it.variant.product.name,
    slug: it.variant.product.slug,
    unit: it.variant.product.unit,
    image: it.variant.product.images[0] ?? null,
    pricePaise: it.variant.pricePaise,
    mrpPaise: it.variant.mrpPaise,
    lineTotalPaise: it.variant.pricePaise * it.quantity,
  };
}

/* ---------- Orders ---------- */

export type OrderItemLike = {
  id: string;
  variantId: string | null;
  productName: string;
  variantLabel: string;
  unit: string | null;
  image: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  quantity: number;
  lineTotalPaise: number;
};

export function serializeOrderItem(i: OrderItemLike) {
  return { ...i };
}

export type OrderLike = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  fulfillmentType: string;
  paymentMethod: string;
  paymentStatus: string;
  addressSnapshot: unknown;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  notes: string | null;
  placedAt: Date;
  confirmedAt: Date | null;
  packedAt: Date | null;
  outForDeliveryAt: Date | null;
  readyForPickupAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  assignedAt: Date | null;
  slot?: { id: string; date: Date; startTime: string; endTime: string } | null;
  deliveryPartner?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string; phone: string | null } | null;
  items?: OrderItemLike[];
  events?: { id: string; status: string; note: string | null; createdAt: Date }[];
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function serializeOrder(o: OrderLike) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    status: o.status,
    fulfillmentType: o.fulfillmentType,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    addressSnapshot: o.addressSnapshot ?? null,
    subtotalPaise: o.subtotalPaise,
    deliveryFeePaise: o.deliveryFeePaise,
    discountPaise: o.discountPaise,
    taxPaise: o.taxPaise,
    totalPaise: o.totalPaise,
    notes: o.notes,
    placedAt: o.placedAt.toISOString(),
    confirmedAt: iso(o.confirmedAt),
    packedAt: iso(o.packedAt),
    outForDeliveryAt: iso(o.outForDeliveryAt),
    readyForPickupAt: iso(o.readyForPickupAt),
    completedAt: iso(o.completedAt),
    cancelledAt: iso(o.cancelledAt),
    assignedAt: iso(o.assignedAt),
    slot: o.slot
      ? { id: o.slot.id, date: o.slot.date.toISOString(), startTime: o.slot.startTime, endTime: o.slot.endTime }
      : null,
    deliveryPartner: o.deliveryPartner ?? null,
    user: o.user ?? null,
    items: (o.items ?? []).map(serializeOrderItem),
    events: (o.events ?? []).map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/* ---------- Settings & slots ---------- */

export type SettingsLike = {
  storeName: string;
  tagline: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise: number | null;
  minOrderValuePaise: number;
  gstEnabled: boolean;
  gstin: string | null;
  taxRatePercent: number;
  acceptingOrders: boolean;
};

export function serializeSettings(s: SettingsLike) {
  return { ...s };
}

export type SlotLike = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  fulfillmentType: string;
  isActive: boolean;
  _count?: { orders: number };
};

export function serializeSlot(s: SlotLike, booked?: number) {
  const used = booked ?? s._count?.orders ?? 0;
  return {
    id: s.id,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    capacity: s.capacity,
    booked: used,
    available: Math.max(0, s.capacity - used),
    fulfillmentType: s.fulfillmentType,
    isActive: s.isActive,
  };
}
