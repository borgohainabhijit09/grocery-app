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

export type ProductCardVariant = {
  id: string;
  pricePaise: number;
  mrpPaise: number | null;
  stockQty: number;
  lowStockThreshold?: number;
  inStock: boolean;
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  unit: string | null;
  image: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  discountPercent: number;
  inStock: boolean;
  variants: ProductCardVariant[];
};

export type Product = {
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
  pricePaise: number;
  mrpPaise: number | null;
  discountPercent: number;
  inStock: boolean;
  variants: Variant[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export type CategoryNode = Category & { children: CategoryNode[] };

export type CartItem = {
  id: string;
  variantId: string;
  quantity: number;
  maxQty: number;
  inStock: boolean;
  label: string;
  name: string;
  slug: string;
  unit: string | null;
  image: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  lineTotalPaise: number;
};

export type Cart = {
  items: CartItem[];
  subtotalPaise: number;
  count: number;
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

export type FulfillmentType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "COD" | "RAZORPAY";

export type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  available: number;
  fulfillmentType: FulfillmentType;
  isActive: boolean;
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

export type PlacedOrder = { id: string; orderNumber: string; totalPaise: number };

export type RazorpayInfo = {
  orderId: string;
  rzpOrderId: string;
  keyId: string;
  amountPaise: number;
};

export type PlaceOrderInput = {
  fulfillmentType: FulfillmentType;
  addressId?: string;
  slotId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
};

export type PublicCoupon = {
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  expiresAt: string | null;
};

export type Paged<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
