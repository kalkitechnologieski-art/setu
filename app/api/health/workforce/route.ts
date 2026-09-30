// app/api/health/workforce/route.ts
// Reports whether the four AI employees are registered and operational.
// Safe for public access: returns agent slugs and status only.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPECTED_AGENTS = ["arjun", "meera", "kabir", "siddhi"] as const;

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || key === "__SET_ME__") {
      return NextResponse.json(
        {
          ok: false,
          at: new Date().toISOString(),
          reason: "database_not_configured",
          expected: EXPECTED_AGENTS,
          registered: [],
        },
        { status: 200 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agent_registry")
      .select("slug, name, role, status, autonomy")
      .in("slug", EXPECTED_AGENTS);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          at: new Date().toISOString(),
          reason: "query_failed",
          expected: EXPECTED_AGENTS,
          registered: [],
        },
        { status: 200 }
      );
    }

    const registered = data ?? [];
    const registeredSlugs = new Set(registered.map((a) => a.slug));
    const missing = EXPECTED_AGENTS.filter((s) => !registeredSlugs.has(s));

    return NextResponse.json(
      {
        ok: missing.length === 0,
        at: new Date().toISOString(),
        total: registered.length,
        expected: EXPECTED_AGENTS.length,
        missing,
        agents: registered.map((a) => ({
          slug: a.slug,
          name: a.name,
          role: a.role,
          status: a.status,
          autonomy: a.autonomy,
        })),
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        at: new Date().toISOString(),
        reason: "unexpected_error",
        expected: EXPECTED_AGENTS,
        registered: [],
      },
      { status: 200 }
    );
  }
}
