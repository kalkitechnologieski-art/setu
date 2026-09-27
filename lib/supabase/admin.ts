// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Server-only admin client using the service role key.
 * NEVER import this into a Client Component.
 */
export function createAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run: ./phase2.sh add-keys"
    );
  }
  cached = createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
