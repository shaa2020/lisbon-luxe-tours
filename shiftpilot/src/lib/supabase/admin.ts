import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. BYPASSES Row Level Security.
 *
 * Only use from server code, only after the caller has been authorised with
 * the user-scoped client or the auth helpers, and only for operations that
 * cannot run as the user (e.g. creating invitations for users who do not yet
 * exist, delivering notifications, public application intake).
 * The `server-only` import makes bundling this into browser code a build error.
 */
export function createAdminClient() {
  const key = serverEnv.supabaseServiceRoleKey();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured (server-side only). See ENVIRONMENT.md.");
  }
  return createSupabaseClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAdminClientConfigured() {
  return Boolean(serverEnv.supabaseServiceRoleKey());
}
