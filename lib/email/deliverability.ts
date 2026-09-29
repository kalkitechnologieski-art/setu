// lib/email/deliverability.ts
// Warm-up schedule + bounce monitor + sender score.

import { createClient } from "@/lib/supabase/server";

// 4-week warm-up curve (matches current industry practice)
const WARMUP_CURVE = [
  { week: 1, dailyLimit: 50 },
  { week: 2, dailyLimit: 100 },
  { week: 3, dailyLimit: 250 },
  { week: 4, dailyLimit: 500 },
  { week: 5, dailyLimit: 1000 },
];

export function dailyLimitForStage(stage: number): number {
  const entry = WARMUP_CURVE[Math.min(stage - 1, WARMUP_CURVE.length - 1)];
  return entry?.dailyLimit ?? 50;
}

export interface DomainHealth {
  domain: string;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  dmarcPolicy: "none" | "quarantine" | "reject" | null;
  senderScore: number;
  warmupStage: number;
  bounceRate: number;
  complaintRate: number;
  safe: boolean;
}

export function computeSenderScore(input: {
  bounceRate: number;
  complaintRate: number;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}): number {
  let score = 50;
  if (input.spf) score += 15;
  if (input.dkim) score += 15;
  if (input.dmarc) score += 15;

  // Penalty: bounce > 2% costs points linearly
  if (input.bounceRate > 2) score -= Math.min(40, (input.bounceRate - 2) * 10);

  // Penalty: complaint > 0.1%
  if (input.complaintRate > 0.1) score -= Math.min(40, (input.complaintRate - 0.1) * 100);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getDomainHealth(userId: string, domain: string): Promise<DomainHealth | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_domains")
    .select("*")
    .eq("user_id", userId)
    .eq("domain", domain)
    .maybeSingle();
  if (!data) return null;

  return {
    domain: data.domain,
    spf: data.spf_verified,
    dkim: data.dkim_verified,
    dmarc: data.dmarc_verified,
    dmarcPolicy: data.dmarc_policy as DomainHealth["dmarcPolicy"],
    senderScore: data.sender_score,
    warmupStage: data.warmup_stage,
    bounceRate: Number(data.bounce_rate),
    complaintRate: Number(data.complaint_rate),
    safe: data.spf_verified && data.dkim_verified && Number(data.bounce_rate) < 2,
  };
}
