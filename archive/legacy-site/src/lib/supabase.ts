import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client, or null when the project isn't configured yet.
 * The site falls back to local seed data (src/lib/menu-data.ts) in that case,
 * so it runs out of the box.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
