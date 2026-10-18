import Constants from "expo-constants";

import type {
  Address,
  ApiUser,
  Cart,
  Category,
  CategoryNode,
  MeResponse,
  Order,
  Paged,
  PlaceOrderInput,
  PlacedOrder,
  Product,
  ProductCard,
  RazorpayInfo,
  PublicCoupon,
  Settings,
  Slot,
  FulfillmentType,
  PaymentMethod,
} from "./types";

function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:3010`;
  return "http://localhost:3010";
}

export const API_BASE_URL = resolveBaseUrl();

let authToken: string | null = null;
export function setApiToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestInitLite = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function request<T>(path: string, init: RequestInitLite = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch {
    throw new ApiError(0, "Network error. Check your connection and API URL.");
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; details?: Record<string, string[]> };
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.details);
  }

  return data as T;
}

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export type ProductQuery = {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc";
  page?: number;
  pageSize?: number;
};

export const api = {
  // ---- auth ----
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: ApiUser }>("/api/v1/auth/register", {
      method: "POST",
      body: input,
    }),
  otpRequest: (phone: string) =>
    request<{ ok: boolean; devCode?: string }>("/api/v1/auth/otp/request", {
      method: "POST",
      body: { phone },
    }),
  otpVerify: (phone: string, code: string, name?: string) =>
    request<{ token: string; user: ApiUser }>("/api/v1/auth/otp/verify", {
      method: "POST",
      body: { phone, code, name },
    }),
  me: () => request<MeResponse>("/api/v1/me"),
  updateMe: (input: { name?: string; phone?: string }) =>
    request<{ user: ApiUser }>("/api/v1/me", { method: "PATCH", body: input }),

  // ---- catalog ----
  products: (query: ProductQuery = {}) =>
    request<Paged<ProductCard>>(`/api/v1/products${qs(query)}`),
  product: (slug: string) => request<{ product: Product }>(`/api/v1/products/${slug}`),
  suggest: (q: string) =>
    request<{
      products: {
        id: string;
        name: string;
        slug: string;
        unit: string | null;
        image: string | null;
        pricePaise: number;
        inStock: boolean;
      }[];
      categories: { name: string; slug: string }[];
      terms: string[];
    }>(`/api/v1/products/suggest${qs({ q })}`),
  stockAlert: (productId: string, input: { variantId?: string; productName?: string } = {}) =>
    request<{ ok: boolean }>(`/api/v1/products/${productId}/stock-alert`, {
      method: "POST",
      body: input,
    }),
  categories: () =>
    request<{ items: Category[]; tree: CategoryNode[] }>("/api/v1/categories"),
  settings: () => request<{ settings: Settings }>("/api/v1/settings"),
  slots: (params: { date?: string; fulfillmentType?: FulfillmentType } = {}) =>
    request<{ items: Slot[] }>(`/api/v1/slots${qs(params)}`),

  // ---- cart ----
  cart: () => request<Cart>("/api/v1/cart"),
  cartAdd: (variantId: string, quantity = 1) =>
    request<Cart>("/api/v1/cart", { method: "POST", body: { variantId, quantity } }),
  cartUpdate: (variantId: string, quantity: number) =>
    request<Cart>("/api/v1/cart", { method: "PATCH", body: { variantId, quantity } }),
  cartRemove: (variantId: string) =>
    request<Cart>(`/api/v1/cart${qs({ variantId })}`, { method: "DELETE" }),
  cartClear: () => request<Cart>(`/api/v1/cart${qs({ all: 1 })}`, { method: "DELETE" }),

  // ---- addresses ----
  addresses: () => request<{ items: Address[] }>("/api/v1/addresses"),
  addressCreate: (input: AddressInput) =>
    request<{ address: Address }>("/api/v1/addresses", { method: "POST", body: input }),
  addressUpdate: (id: string, input: AddressInput) =>
    request<{ address: Address }>(`/api/v1/addresses/${id}`, { method: "PATCH", body: input }),
  addressDelete: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/addresses/${id}`, { method: "DELETE" }),
  addressSetDefault: (id: string) =>
    request<{ address: Address }>(`/api/v1/addresses/${id}/default`, { method: "POST" }),

  // ---- coupons ----
  coupons: () => request<{ items: PublicCoupon[] }>("/api/v1/coupons"),
  validateCoupon: (code: string, subtotalPaise: number) =>
    request<
      | { valid: true; code: string; description: string | null; discountPaise: number }
      | { valid: false; error: string }
    >("/api/v1/coupons/validate", { method: "POST", body: { code, subtotalPaise } }),

  // ---- orders ----
  orders: (params: { status?: string; page?: number; pageSize?: number } = {}) =>
    request<Paged<Order>>(`/api/v1/orders${qs(params)}`),
  order: (id: string) => request<{ order: Order }>(`/api/v1/orders/${id}`),
  placeOrder: (input: PlaceOrderInput) =>
    request<{ order: PlacedOrder; razorpay: RazorpayInfo | null }>("/api/v1/orders", {
      method: "POST",
      body: input,
    }),
  cancelOrder: (id: string, reason?: string) =>
    request<{ ok: boolean }>(`/api/v1/orders/${id}/cancel`, { method: "POST", body: { reason } }),
  reorder: (id: string) => request<Cart>(`/api/v1/orders/${id}/reorder`, { method: "POST" }),

  // ---- push ----
  registerDevice: (token: string, platform: "android" | "ios") =>
    request<{ ok: boolean }>("/api/v1/notifications/register", {
      method: "POST",
      body: { token, platform },
    }),
};

export type AddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
};

export type { PaymentMethod };
