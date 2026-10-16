import type { ProductQuery } from "shared";

/**
 * Base URL of the grocery API. On a physical device or emulator, replace
 * localhost with your machine's LAN IP (or use a tunnel).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

async function request<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<ApiResult<T>> {
  try {
    const { token, ...rest } = init ?? {};
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { data: null, error: body.error ?? `Request failed (${res.status})` };
    }
    return { data: (await res.json()) as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

export const api = {
  health: () => request<{ ok: boolean; db: boolean }>("/api/health"),
  products: (query: Partial<ProductQuery> = {}) => {
    const params = new URLSearchParams(
      Object.entries(query).reduce<Record<string, string>>((acc, [k, v]) => {
        if (v !== undefined && v !== null) acc[k] = String(v);
        return acc;
      }, {})
    );
    return request(`/api/products?${params.toString()}`);
  },
};
