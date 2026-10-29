import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://sapvrcketihbhtkcpefw.supabase.co";

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_mm5kNX7HBDNv3gH1_FpzSA_XwefaQXO";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseUrl.startsWith("http") &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

