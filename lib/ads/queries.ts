// lib/ads/queries.ts
import { createClient } from "@/lib/supabase/server";
import type { AdCampaignRow, AdPlatformRow } from "./types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getAdPlatformRows(userId: string): Promise<AdPlatformRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data, error } = await supabase
    .from("ad_performance")
    .select("platform, spend, impressions, clicks, conversions, roas")
    .eq("user_id", userId)
    .gte("synced_at", since);
  if (error) return [];

  const map = new Map<string, AdPlatformRow>();
  for (const row of data ?? []) {
    const existing = map.get(row.platform) ?? {
      platform: row.platform,
      spend: 0, impressions: 0, clicks: 0, conversions: 0, roas: 0, share: 0,
    };
    existing.spend += Number(row.spend);
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.conversions += row.conversions;
    existing.roas += Number(row.roas);
    map.set(row.platform, existing);
  }

  const rows = Array.from(map.values());
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  for (const r of rows) {
    r.share = totalSpend > 0 ? (r.spend / totalSpend) * 100 : 0;
  }
  return rows.sort((a, b) => b.spend - a.spend);
}

export async function getAdCampaignRows(
  userId: string
): Promise<AdCampaignRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const { data, error } = await supabase
    .from("ad_performance")
    .select("platform, campaign_name, spend, impressions, clicks, conversions, roas")
    .eq("user_id", userId)
    .gte("synced_at", since)
    .order("spend", { ascending: false })
    .limit(100);
  if (error) return [];

  return (data ?? []).map((row) => {
    const roas = Number(row.roas);
    const status: AdCampaignRow["status"] =
      roas >= 3 ? "healthy" : roas >= 2 ? "warning" : "paused";
    return {
      platform: row.platform,
      campaign_name: row.campaign_name ?? "Unnamed campaign",
      spend: Number(row.spend),
      impressions: row.impressions,
      clicks: row.clicks,
      conversions: row.conversions,
      roas,
      status,
    };
  });
}

export function buildRecommendations(
  rows: AdPlatformRow[]
): import("./types").BudgetRecommendation[] {
  if (rows.length < 2) return [];
  const sorted = [...rows].sort((a, b) => b.roas - a.roas);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (!best || !worst || worst.roas >= best.roas) return [];

  const gap = best.roas - worst.roas;
  if (gap < 0.5) return [];

  const shift = Math.max(2000, Math.round(worst.spend * 0.15 / 100) * 100);
  const confidence = Math.min(0.95, 0.6 + gap * 0.08);

  return [
    {
      id: `rebalance-${worst.platform}-${best.platform}`,
      from_platform: worst.platform,
      to_platform: best.platform,
      amount: shift,
      reason: `ROAS gap ${worst.roas.toFixed(1)}x vs ${best.roas.toFixed(1)}x`,
      confidence,
      expected_impact: `+${Math.round(shift * (best.roas - worst.roas) / 100)} monthly conversions`,
    },
  ];
}
