/**
 * store/apiClient.ts
 * Typed HTTP client for the Bistro API server.
 * Falls back gracefully when the server is unreachable.
 */

import type {
  AIOrderRequest,
  AIOrderResponse,
  ApiResponse,
  MenuCategory,
  MenuItem,
} from "@shared/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: text || `Request failed with status ${response.status}`,
      },
    };
  }

  return response.json() as Promise<ApiResponse<T>>;
}

/**
 * Sends a natural language utterance to the AI ordering endpoint.
 * Returns null if the server is unreachable (network error).
 */
export async function sendAIOrder(
  request: AIOrderRequest,
  signal?: AbortSignal
): Promise<ApiResponse<AIOrderResponse> | null> {
  try {
    return await post<AIOrderResponse>("/api/ai/order", request, signal);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    // Network error — server unreachable
    return null;
  }
}

/**
 * Validates a promo code against the server.
 * Returns null on network failure.
 */
export async function validatePromoRemote(
  code: string,
  subtotalCents: number
): Promise<ApiResponse<{ discountCents: number }> | null> {
  try {
    return await post<{ discountCents: number }>("/api/promo/validate", {
      code,
      subtotalCents,
    });
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU / PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    return { success: false, error: { code: `HTTP_${response.status}`, message: "Request failed" } };
  }
  return response.json() as Promise<ApiResponse<T>>;
}

/** Fetch all menu categories from the API */
export async function fetchCategories(): Promise<MenuCategory[] | null> {
  try {
    const res = await get<MenuCategory[]>("/api/categories");
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

/** Fetch all products (up to 100) from the API */
export async function fetchProducts(): Promise<MenuItem[] | null> {
  try {
    const res = await get<{ products: MenuItem[]; total: number }>("/api/products?limit=100");
    return res.success ? res.data.products : null;
  } catch {
    return null;
  }
}

/** Fetch a single product by ID */
export async function fetchProductById(id: string): Promise<MenuItem | null> {
  try {
    const res = await get<MenuItem>(`/api/products/${id}`);
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH / PROFILE
// ─────────────────────────────────────────────────────────────────────────────

async function authGet<T>(path: string, token: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!response.ok) return { success: false, error: { code: `HTTP_${response.status}`, message: "Request failed" } };
  return response.json() as Promise<ApiResponse<T>>;
}

async function authPost<T>(path: string, body: unknown, token: string, method = "POST"): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { success: false, error: { code: `HTTP_${response.status}`, message: text || "Request failed" } };
  }
  return response.json() as Promise<ApiResponse<T>>;
}

export async function updateProfile(
  data: { displayName?: string; phone?: string | null; avatarUrl?: string | null },
  token: string
): Promise<ApiResponse<any> | null> {
  try { return await authPost("/api/auth/profile", data, token, "PATCH"); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESSES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAddresses(token: string): Promise<any[] | null> {
  try {
    const res = await authGet<any[]>("/api/user/addresses", token);
    return res.success ? res.data : null;
  } catch { return null; }
}

export async function addAddress(data: object, token: string): Promise<ApiResponse<any> | null> {
  try { return await authPost("/api/user/addresses", data, token); } catch { return null; }
}

export async function deleteAddress(id: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/user/addresses/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    return response.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAVOURITES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFavourites(token: string): Promise<string[] | null> {
  try {
    const res = await authGet<string[]>("/api/user/favourites", token);
    return res.success ? res.data : null;
  } catch { return null; }
}

export async function addFavourite(menuItemId: string, token: string): Promise<boolean> {
  try {
    const res = await authPost("/api/user/favourites", { menuItemId }, token);
    return (res as any).success ?? false;
  } catch { return false; }
}

export async function removeFavourite(menuItemId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/user/favourites/${menuItemId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    return response.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchNotificationPrefs(token: string): Promise<any | null> {
  try {
    const res = await authGet<any>("/api/user/notifications", token);
    return res.success ? res.data : null;
  } catch { return null; }
}

export async function updateNotificationPrefs(data: object, token: string): Promise<boolean> {
  try {
    const res = await authPost("/api/user/notifications", data, token, "PATCH");
    return (res as any).success ?? false;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function placeOrder(data: object, token: string): Promise<ApiResponse<any> | null> {
  try { return await authPost("/api/orders", data, token); } catch { return null; }
}

export async function fetchOrders(token: string): Promise<any[] | null> {
  try {
    const res = await authGet<any[]>("/api/orders", token);
    return res.success ? res.data : null;
  } catch { return null; }
}
