export type Role = "CUSTOMER" | "STAFF" | "ADMIN" | "DELIVERY";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  phoneVerified: boolean;
  createdAt: string;
};

export type MeResponse = {
  user: ApiUser;
  stats: { orders: number; addresses: number };
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type FulfillmentType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "COD" | "RAZORPAY";

export type OrderItem = {
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

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  note: string | null;
  actorName?: string | null;
  createdAt: string;
};

export type OrderPayment = {
  id: string;
  provider: string;
  method: string;
  status: string;
  amountPaise: number;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  createdAt: string;
};

export type Address = {
  id: string;
  userId?: string;
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

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  addressSnapshot: Record<string, unknown> | null;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  notes: string | null;
  placedAt: string;
  confirmedAt: string | null;
  packedAt: string | null;
  outForDeliveryAt: string | null;
  readyForPickupAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  assignedAt: string | null;
  slot: { id: string; date: string; startTime: string; endTime: string } | null;
  deliveryPartner: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string; phone: string | null } | null;
  items: OrderItem[];
  events?: OrderEvent[];
};

export type AdminOrderDetail = Order & {
  payments: OrderPayment[];
  address: Address | null;
  deliveryPartnerId: string | null;
};

export type DeliveryPartnerOption = { id: string; name: string; isActive: boolean };

export type Variant = {
  id: string;
  label: string;
  pricePaise: number;
  mrpPaise: number | null;
  stockQty: number;
  inStock: boolean;
  lowStockThreshold: number;
  sku: string | null;
  isActive: boolean;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  categoryName: string;
  variantCount: number;
  minPricePaise: number;
  maxPricePaise: number;
  discountPercent: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  brand: string | null;
  unit: string | null;
  images: string[];
  tags: string[];
  categoryId: string;
  category: { id: string; name: string; slug: string } | null;
  isActive: boolean;
  isFeatured: boolean;
  variantCount: number;
  minPricePaise: number;
  maxPricePaise: number;
  totalStock: number;
  variants: Variant[];
};

export type ProductInput = {
  name: string;
  slug?: string;
  description?: string;
  brand?: string;
  unit?: string;
  categoryId: string;
  images: string[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  variants: {
    id?: string;
    label: string;
    pricePaise: number;
    mrpPaise?: number | null;
    stockQty: number;
    sku?: string;
  }[];
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  childCount: number;
};

export type CategoryInput = {
  name: string;
  slug?: string;
  image?: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  phoneVerified: boolean;
  orderCount: number;
  spendPaise: number;
  createdAt: string;
};

export type AdminDeliveryPartner = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  openOrders: number;
};

export type NotificationRow = {
  id: string;
  userId: string | null;
  channel: string;
  status: string;
  template: string;
  orderNumber: string | null;
  recipient: string | null;
  attempts: number;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type DashboardStats = {
  products: number;
  categories: number;
  orders: number;
  pending: number;
  lowStock: number;
  revenuePaise: number;
};

export type RecentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPaise: number;
  customerName: string;
  placedAt: string;
};

export type Settings = {
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

export type SettingsInput = {
  storeName: string;
  tagline?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise?: number | null;
  minOrderValuePaise: number;
  gstEnabled: boolean;
  gstin?: string;
  taxRatePercent: number;
  acceptingOrders: boolean;
};

export type ProcessSummary = { scanned: number; sent: number; failed: number };

export type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "SCHEDULED" | "EXHAUSTED";

export type AdminCoupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  status: CouponStatus;
  createdAt: string;
};

export type CouponInput = {
  code: string;
  description?: string;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  maxUses?: number | null;
  startsAt?: string;
  expiresAt?: string | null;
  isActive: boolean;
};

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
