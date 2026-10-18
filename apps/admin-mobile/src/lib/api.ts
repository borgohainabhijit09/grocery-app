import Constants from "expo-constants";

import type {
  Address,
  AdminCategory,
  AdminCoupon,
  AdminCustomer,
  AdminDeliveryPartner,
  AdminOrderDetail,
  AdminProduct,
  AdminProductRow,
  ApiUser,
  CategoryInput,
  CouponInput,
  DashboardStats,
  DeliveryPartnerOption,
  InventoryRow,
  MeResponse,
  NotificationRow,
  Order,
  Paged,
  ProcessSummary,
  ProductInput,
  RecentOrder,
  Settings,
  SettingsInput,
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

export const api = {
  // ---- auth / account ----
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<MeResponse>("/api/v1/me"),

  // ---- dashboard ----
  stats: () =>
    request<{ stats: DashboardStats; recentOrders: RecentOrder[] }>("/api/v1/admin/stats"),

  // ---- orders ----
  orders: (params: { status?: string; q?: string; assign?: "unassigned"; page?: number } = {}) =>
    request<Paged<Order> & { statusCounts: Record<string, number> }>(
      `/api/v1/admin/orders${qs(params)}`
    ),
  order: (id: string) =>
    request<{ order: AdminOrderDetail; partners: DeliveryPartnerOption[] }>(
      `/api/v1/admin/orders/${id}`
    ),
  orderStatus: (id: string, status: string, note?: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/orders/${id}/status`, {
      method: "POST",
      body: { status, note },
    }),
  orderPaid: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/orders/${id}/paid`, { method: "POST" }),
  orderAssign: (id: string, partnerId: string | null) =>
    request<{ ok: boolean }>(`/api/v1/admin/orders/${id}/assign`, {
      method: "POST",
      body: { partnerId },
    }),

  // ---- products ----
  products: (q?: string) =>
    request<{ items: AdminProductRow[]; total: number }>(
      `/api/v1/admin/products${qs({ q })}`
    ),
  product: (id: string) => request<{ product: AdminProduct }>(`/api/v1/admin/products/${id}`),
  productCreate: (input: ProductInput) =>
    request<{ id: string }>("/api/v1/admin/products", { method: "POST", body: input }),
  productUpdate: (id: string, input: ProductInput) =>
    request<{ ok: boolean; id: string }>(`/api/v1/admin/products/${id}`, {
      method: "PATCH",
      body: input,
    }),
  productDelete: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/products/${id}`, { method: "DELETE" }),
  productToggle: (id: string, field: "isActive" | "isFeatured", value: boolean) =>
    request<{ ok: boolean }>(`/api/v1/admin/products/${id}/toggle`, {
      method: "PATCH",
      body: { field, value },
    }),

  // ---- categories ----
  categories: () => request<{ items: AdminCategory[] }>("/api/v1/admin/categories"),
  categoryCreate: (input: CategoryInput) =>
    request<{ id: string }>("/api/v1/admin/categories", { method: "POST", body: input }),
  categoryUpdate: (id: string, input: CategoryInput) =>
    request<{ ok: boolean; id: string }>(`/api/v1/admin/categories/${id}`, {
      method: "PATCH",
      body: input,
    }),
  categoryDelete: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/categories/${id}`, { method: "DELETE" }),

  // ---- coupons ----
  coupons: (params: { q?: string; status?: string } = {}) =>
    request<{ items: AdminCoupon[] }>(`/api/v1/admin/coupons${qs(params)}`),
  couponCreate: (input: CouponInput) =>
    request<{ id: string }>("/api/v1/admin/coupons", { method: "POST", body: input }),
  couponUpdate: (id: string, input: CouponInput) =>
    request<{ ok: boolean; id: string }>(`/api/v1/admin/coupons/${id}`, {
      method: "PATCH",
      body: input,
    }),
  couponDelete: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/admin/coupons/${id}`, { method: "DELETE" }),
  couponToggle: (id: string) =>
    request<{ id: string; isActive: boolean }>(`/api/v1/admin/coupons/${id}/toggle`, {
      method: "POST",
    }),

  // ---- inventory ----
  inventory: () => request<{ items: InventoryRow[] }>("/api/v1/admin/inventory"),  inventorySet: (variantId: string, stockQty: number) =>
    request<{ variantId: string; stockQty: number; lowStockThreshold: number }>(
      "/api/v1/admin/inventory",
      { method: "POST", body: { action: "set", variantId, stockQty } }
    ),
  inventoryAdjust: (variantId: string, delta: number) =>
    request<{ variantId: string; stockQty: number; lowStockThreshold: number }>(
      "/api/v1/admin/inventory",
      { method: "POST", body: { action: "adjust", variantId, delta } }
    ),
  inventoryThreshold: (variantId: string, lowStockThreshold: number) =>
    request<{ variantId: string; stockQty: number; lowStockThreshold: number }>(
      "/api/v1/admin/inventory",
      { method: "POST", body: { action: "threshold", variantId, lowStockThreshold } }
    ),

  // ---- customers ----
  customers: (params: { q?: string; page?: number } = {}) =>
    request<Paged<AdminCustomer>>(`/api/v1/admin/customers${qs(params)}`),
  customer: (id: string) =>
    request<{ customer: AdminCustomer; addresses: Address[]; orders: Order[] }>(
      `/api/v1/admin/customers/${id}`
    ),

  // ---- delivery partners ----
  delivery: () => request<{ items: AdminDeliveryPartner[] }>("/api/v1/admin/delivery"),
  deliveryCreate: (input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => request<{ id: string }>("/api/v1/admin/delivery", { method: "POST", body: input }),
  deliveryToggle: (id: string) =>
    request<{ id: string; isActive: boolean }>(`/api/v1/admin/delivery/${id}/toggle`, {
      method: "POST",
    }),

  // ---- settings ----
  settings: () => request<{ settings: Settings }>("/api/v1/admin/settings"),
  settingsUpdate: (input: SettingsInput) =>
    request<{ settings: Settings }>("/api/v1/admin/settings", { method: "PUT", body: input }),

  // ---- notifications ----
  notifications: (params: { status?: string; page?: number } = {}) =>
    request<Paged<NotificationRow> & { statusCounts: Record<string, number> }>(
      `/api/v1/admin/notifications${qs(params)}`
    ),
  notificationsProcess: (includeFailed = false) =>
    request<{ ok: boolean } & ProcessSummary>("/api/v1/admin/notifications/process", {
      method: "POST",
      body: { includeFailed },
    }),
  notificationRetry: (id: string) =>
    request<{ ok: boolean } & ProcessSummary>(`/api/v1/admin/notifications/${id}/retry`, {
      method: "POST",
    }),
};
