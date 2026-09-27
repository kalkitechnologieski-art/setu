// lib/content/queries.ts
import { createClient } from "@/lib/supabase/server";
import type { ContentPostRow } from "./types";

export interface ContentStats {
  total: number;
  draft: number;
  scheduled: number;
  published: number;
  pending: number;
}

export async function listContentPosts(
  userId: string,
  limit = 100
): Promise<ContentPostRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ContentPostRow[];
}

export async function getContentStats(userId: string): Promise<ContentStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("status")
    .eq("user_id", userId);
  if (error) {
    return { total: 0, draft: 0, scheduled: 0, published: 0, pending: 0 };
  }

  const rows = (data ?? []) as Array<{ status: string }>;
  return {
    total: rows.length,
    draft: rows.filter((r) => r.status === "draft").length,
    scheduled: rows.filter((r) => r.status === "scheduled").length,
    published: rows.filter((r) => r.status === "published").length,
    pending: rows.filter((r) => r.status === "pending_approval").length,
  };
}
