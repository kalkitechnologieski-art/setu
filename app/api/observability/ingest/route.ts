// app/api/observability/ingest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toJson } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Payload = z.object({
  message: z.string().max(2000),
  stack: z.string().max(10000).optional(),
  context: z.object({
    scope: z.string().max(200),
    userId: z.string().optional(),
    route: z.string().max(500).optional(),
    digest: z.string().max(200).optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  }),
  at: z.string(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(1000).optional(),
});

/**
 * Ingest a client-side error report.
 *
 * Writes to governance_events with severity=warning. Never throws — always
 * returns 200 so the client-side `fetch(..., {keepalive: true})` doesn't
 * log a spurious error.
 */
export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof Payload>;
  try {
    parsed = Payload.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("governance_events").insert({
        user_id: user.id,
        actor_type: "system",
        actor_id: "observability",
        event_type: "client_error",
        severity: "warning",
        summary: parsed.message.slice(0, 500),
        payload: toJson({
          stack: parsed.stack,
          route: parsed.context.route,
          digest: parsed.context.digest,
          url: parsed.url,
          ua: parsed.userAgent,
          extra: parsed.context.extra,
        }),
      });
    }
  } catch {
    /* never fail the ingest */
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
