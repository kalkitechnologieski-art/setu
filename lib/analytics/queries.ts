// lib/analytics/queries.ts
// Content performance + channel attribution queries.
import { createClient } from "@/lib/supabase/server";

export interface ContentPerformanceRow {
  platform: string;
  posts: number;
  impressions: number;
  engagement: number;
  clicks: number;
  conversions: number;
}

export interface ChannelAttribution {
  channel: string;
  share: number;
  conversions: number;
}

export async function getContentPerformance(
  userId: string
): Promise<ContentPerformanceRow[]> {
  // Content metrics are not yet wired — return empty for graceful UI
  void userId;
  return [];
}

export async function getChannelAttribution(
  userId: string
): Promise<ChannelAttribution[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("source")
    .eq("user_id", userId);
  if (error) return [];

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  return Array.from(counts.entries())
    .map(([channel, count]) => ({
      channel,
      share: (count / total) * 100,
      conversions: count,
    }))
    .sort((a, b) => b.share - a.share);
}
