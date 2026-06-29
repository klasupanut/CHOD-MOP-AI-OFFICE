import "server-only";

export type SupabaseServerConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  enabled: boolean;
  serviceRoleEnabled: boolean;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";

  return {
    url,
    anonKey,
    serviceRoleKey,
    enabled: useSupabase && Boolean(url && anonKey),
    serviceRoleEnabled: useSupabase && Boolean(url && serviceRoleKey),
  };
}

export function assertSupabaseServerReady() {
  const config = getSupabaseServerConfig();
  if (!config.enabled) {
    throw new Error("Supabase server is not enabled. Keep mock/Google Sheet mode or configure Supabase env first.");
  }
  return config;
}

export function assertSupabaseServiceRoleReady() {
  const config = getSupabaseServerConfig();
  if (!config.serviceRoleEnabled) {
    throw new Error("Supabase service role is not configured. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.");
  }
  return config;
}
