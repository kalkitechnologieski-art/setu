// app/api/cron/refresh-tokens/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshConnectionAdmin } from "@/lib/auth/token-manager";
import { PROVIDERS, type ProviderKey } from "@/lib/auth/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refresh every active platform connection whose access token expires within
 * the next 15 minutes.
 *
 * Triggered by Vercel Cron (see vercel.json). Guarded by CRON_SECRET —
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` on every invocation.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");

  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const threshold = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: conns, error } = await admin
    .from("platform_connections")
    .select("id, user_id, provider, expires_at, refresh_token_secret_id")
    .eq("status", "active")
    .not("refresh_token_secret_id", "is", null)
    .lt("expires_at", threshold)
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  if (!conns || conns.length === 0) {
    return NextResponse.json({
      refreshed: 0,
      failed: 0,
      total: 0,
      at: new Date().toISOString(),
    });
  }

  const results: Array<{
    connectionId: string;
    provider: string;
    status: "ok" | "failed";
    error?: string;
  }> = [];

  for (const conn of conns) {
    const provider = conn.provider as ProviderKey;
    const cfg = PROVIDERS[provider];
    if (!cfg) {
      results.push({ connectionId: conn.id, provider, status: "failed", error: "unknown_provider" });
      continue;
    }

    try {
      await refreshConnectionAdmin(conn.id, provider, conn.user_id);
      results.push({ connectionId: conn.id, provider, status: "ok" });
    } catch (e) {
      results.push({
        connectionId: conn.id,
        provider,
        status: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const refreshed = results.filter((r) => r.status === "ok").length;
  const failed = results.length - refreshed;

  return NextResponse.json({
    refreshed,
    failed,
    total: results.length,
    at: new Date().toISOString(),
    results,
  });
}
