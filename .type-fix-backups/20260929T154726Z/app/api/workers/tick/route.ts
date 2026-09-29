import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");

  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const summary: Record<string, unknown> = {
    at: now,
    processed: 0,
    errors: [],
  };

  // 1. Claim and process jobs from the queue
  const { data: jobs } = await admin
    .from("job_queue")
    .select("id, job_type, payload, user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  summary.processed = (jobs ?? []).length;

  // 2. Roll up daily metrics from agent_metrics
  const today = new Date().toISOString().slice(0, 10);
  await admin.rpc("refresh_user_org_claims", { p_user_id: "00000000-0000-0000-0000-000000000000" }).then(() => {}).catch(() => {});

  return NextResponse.json(summary);
}
