/**
 * api-server/src/db/supabase.ts
 * Supabase client singleton for the API server.
 * Uses the service role key for full database access (server-side only).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in api-server/.env\n" +
      "Get them from: https://supabase.com/dashboard → Project Settings → API"
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  category_id: string;
  dietary_tags: string[];
  calories: number | null;
  is_available: boolean;
  rating: number;
  review_count: number;
  customization_groups: unknown[];
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  label: string;
  icon_name: string;
  badge_color: string;
  sort_order: number;
}

export interface DbOrder {
  id: string;
  user_id: string;
  status: string;
  items: unknown[];
  pricing: Record<string, number>;
  delivery_address: Record<string, string> | null;
  estimated_delivery: string | null;
  promo_code: string | null;
  tip_amount: number;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
