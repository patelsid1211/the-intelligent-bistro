/**
 * store/supabase.ts
 * Supabase client for the mobile app.
 *
 * LOCAL MODE: If EXPO_PUBLIC_SUPABASE_URL is not set, returns a stub client
 * so the app runs fully on the local API server without Supabase.
 *
 * PRODUCTION: Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 * in .env.local to enable real Supabase auth and real-time subscriptions.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const isConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// Lazy import so the app doesn't crash if @supabase/supabase-js isn't installed
let _supabase: ReturnType<typeof import("@supabase/supabase-js").createClient> | null = null;

export function getSupabaseClient() {
  if (!isConfigured) return null;
  if (_supabase) return _supabase;

  // Dynamic import to avoid crash when keys aren't set
  const { createClient } = require("@supabase/supabase-js");
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return _supabase;
}

// Convenience export — null when running locally
export const supabase = isConfigured ? getSupabaseClient() : null;
