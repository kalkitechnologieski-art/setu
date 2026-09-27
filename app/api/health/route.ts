// app/api/health/route.ts
import { NextResponse } from "next/server";
import { inspectEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe.
 *
 * Returns:
 *   200 + { ok: true }         — all required env present, DB reachable
 *   200 + { ok: false, ... }   — degraded (missing optional only)
 *   503                        — missing required env OR DB unreachable
 *
 * Safe for public access: no secrets are returned, only names.
 */
export async function GET() {
  const startedAt = Date.now();
  const env = inspectEnv();

  let dbOk = false;
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  if (env.ok) {
    try {
      const t0 = Date.now();
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { error } = await supabase
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      dbLatencyMs = Date.now() - t0;
      dbOk = !error;
      if (error) dbError = error.message;
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  const status = env.ok && dbOk ? "healthy" : env.ok ? "degraded" : "unhealthy";
  const httpStatus = !env.ok ? 503 : 200;

  return NextResponse.json(
    {
      ok: env.ok && dbOk,
      status,
      at: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      checks: {
        env: {
          ok: env.ok,
          missingRequired: env.missingRequired,
          missingOptional: env.missingOptional,
          present: env.present,
        },
        database: {
          ok: dbOk,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
      },
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
