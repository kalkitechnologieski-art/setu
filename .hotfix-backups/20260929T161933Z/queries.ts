// lib/notifications/queries.ts
import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_KINDS, resolveKind,
  type NotificationAggregate, type NotificationKind,
  type NotificationRow,
} from "./types";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

export async function listNotifications(
  userId: string,
  limit = DEFAULT_LIMIT
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const effectiveLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, body, kind, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(effectiveLimit);
  if (error) return [];
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function getNotificationAggregate(
  userId: string
): Promise<NotificationAggregate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("kind, read_at")
    .eq("user_id", userId);

  const emptyByKind = Object.fromEntries(
    NOTIFICATION_KINDS.map((k) => [k, 0])
  ) as Record<NotificationKind, number>;

  if (error || !data) {
    return { total: 0, unread: 0, byKind: emptyByKind };
  }

  const byKind = { ...emptyByKind };
  let unread = 0;
  for (const row of data) {
    const kind = resolveKind(row.kind);
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (!row.read_at) unread += 1;
  }
  return { total: data.length, unread, byKind };
}
