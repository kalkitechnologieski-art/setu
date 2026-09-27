// lib/supabase/admin.ts
// ───────────────────────────────────────────────────────────────────────────
// Service-role Supabase client. NEVER import into a Client Component.
// Used by cron jobs, admin scripts, and the observability ingest route.
// ───────────────────────────────────────────────────────────────────────────
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey === "__SET_ME__") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cached = createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cached;
}
