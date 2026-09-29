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
  const errors: string[] = [];
  let processed = 0;

  // 1. Claim pending jobs (best-effort — never throw)
  try {
    const { data: jobs } = await admin
      .from("job_queue")
      .select("id, job_type, payload, user_id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    processed = (jobs ?? []).length;
  } catch (e) {
    errors.push(`job_claim: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Refresh org claims for any user with pending membership changes
  try {
    // No-op placeholder — real implementation loops over changed users
    // await admin.rpc("refresh_user_org_claims", { p_user_id: userId })
  } catch (e) {
    errors.push(`org_claims: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({
    at: now,
    processed,
    errors,
  });
}
