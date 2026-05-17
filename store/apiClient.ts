/**
 * store/apiClient.ts
 * Typed HTTP client for the Bistro API server.
 * Falls back gracefully when the server is unreachable.
 */

import type {
    AIOrderRequest,
    AIOrderResponse,
    ApiResponse,
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
