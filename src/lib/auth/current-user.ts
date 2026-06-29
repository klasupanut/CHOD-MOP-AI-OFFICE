import "server-only";

import { getCurrentApprovedUser } from "@/lib/auth/session";
import type { ApprovedUser } from "@/lib/auth/types";

export type CurrentUserSource = "authjs-google-sheet" | "supabase-auth";

export type CurrentUserResult = {
  user: ApprovedUser | null;
  source: CurrentUserSource;
  supabasePrepared: boolean;
};

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === "true";

  // Phase 1 keeps the existing Auth.js + Google Sheet user store active.
  // Supabase Auth is prepared but not used until the migration is approved.
  return {
    user: await getCurrentApprovedUser(),
    source: "authjs-google-sheet",
    supabasePrepared: useSupabase,
  };
}
