// lib/supabase/client.ts
// ───────────────────────────────────────────────────────────────────────────
// Browser Supabase client. Cookie-based sessions are shared with the
// server client through @supabase/ssr. Singleton — avoids multiple GoTrue
// instances competing for the same cookie jar.
// ───────────────────────────────────────────────────────────────────────────
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || key === "__SET_ME__") {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Run: ./phase2.sh add-keys"
    );
  }

  cached = createBrowserClient<Database>(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cached;
}
