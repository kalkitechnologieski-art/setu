// app/api/health/providers/route.ts
// Readiness probe — reports which LLM providers are correctly configured.
// Safe for public access: never returns key values, only boolean status.

import { NextResponse } from "next/server";
import { getProviderStatus } from "@/lib/llm/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getProviderStatus();
  const configuredCount = providers.filter((p) => p.configured).length;
  const healthyCount = providers.filter((p) => p.configured && p.circuit !== "OPEN").length;

  return NextResponse.json(
    {
      ok: healthyCount > 0,
      at: new Date().toISOString(),
      configured: configuredCount,
      healthy: healthyCount,
      providers: providers.map((p) => ({
        name: p.provider,
        configured: p.configured,
        circuit: p.circuit,
        // Only surface reason for UNCONFIGURED providers (never for working ones)
        issue: p.configured ? undefined : p.reason,
      })),
      degraded: healthyCount === 0,
    },
    {
      status: healthyCount > 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
