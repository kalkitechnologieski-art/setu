import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSenderScore } from "@/lib/email/deliverability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: domains } = await supabase
      .from("email_domains")
      .select("domain, bounce_rate, complaint_rate, spf_verified, dkim_verified, dmarc_verified, sender_score, warmup_stage")
      .eq("user_id", user.id);

    const results = (domains ?? []).map((d) => ({
      domain: d.domain,
      senderScore: computeSenderScore({
        bounceRate: Number(d.bounce_rate),
        complaintRate: Number(d.complaint_rate),
        spf: d.spf_verified,
        dkim: d.dkim_verified,
        dmarc: d.dmarc_verified,
      }),
      safe:
        d.spf_verified &&
        d.dkim_verified &&
        Number(d.bounce_rate) < 2,
      warmupStage: d.warmup_stage,
    }));

    return NextResponse.json({ domains: results });
  } catch {
    return NextResponse.json({ domains: [] });
  }
}
