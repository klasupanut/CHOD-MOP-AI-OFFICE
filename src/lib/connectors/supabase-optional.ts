import { getSupabasePublicConfig } from "@/lib/supabase/client";

// Supabase is optional for the MVP. Keep this dependency-free until it is enabled.
export function getOptionalSupabaseConfig() {
  return getSupabasePublicConfig();
}
