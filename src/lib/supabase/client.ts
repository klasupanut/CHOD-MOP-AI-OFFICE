export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
  enabled: boolean;
};

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";

  return {
    url,
    anonKey,
    enabled: useSupabase && Boolean(url && anonKey),
  };
}

export function assertSupabaseClientReady() {
  const config = getSupabasePublicConfig();
  if (!config.enabled) {
    throw new Error("Supabase client is not enabled. Set NEXT_PUBLIC_USE_SUPABASE=true plus URL and anon key first.");
  }
  return config;
}
