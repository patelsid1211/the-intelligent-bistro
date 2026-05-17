/**
 * store/authClient.ts
 * Typed HTTP client for auth endpoints.
 * Persists tokens to AsyncStorage so sessions survive app restarts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

const TOKEN_KEY = "@bistro/access_token";
const REFRESH_KEY = "@bistro/refresh_token";
const USER_KEY = "@bistro/user";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: object
): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function loadSession(): Promise<{
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
} | null> {
  const pairs = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  const accessToken = pairs[0][1];
  const refreshToken = pairs[1][1];
  const userStr = pairs[2][1];
  if (!accessToken || !refreshToken || !userStr) return null;
  try {
    return { accessToken, refreshToken, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────────────────────────────────────

interface AuthResult {
  success: true;
  data: {
    user: { id: string; email: string; displayName: string; phone?: string };
    accessToken: string;
    refreshToken: string;
  };
}

interface AuthError {
  success: false;
  error: { code: string; message: string };
}

type AuthResponse = AuthResult | AuthError;

export async function apiLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json() as Promise<AuthResponse>;
}

export async function apiSignup(
  email: string,
  password: string,
  displayName: string,
  phone?: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName, phone }),
  });
  return res.json() as Promise<AuthResponse>;
}

export async function apiRefresh(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}

export async function apiForgotPassword(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    return { success: json.success, message: json.data?.message ?? json.error?.message ?? "Unknown error" };
  } catch {
    return { success: false, message: "Could not reach the server. Check your connection." };
  }
}
