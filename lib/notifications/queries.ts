// lib/notifications/queries.ts
// ─────────────────────────────────────────────────────────────────────────
// Read-side queries for notifications. Cursor-based pagination, kind
// filtering, and aggregates. Uses the server Supabase client with RLS
// enforcing user isolation — the explicit `.eq("user_id", ...)` is
// defense-in-depth, not a security boundary.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_KINDS,
  resolveKind,
  type NotificationAggregate,
  type NotificationFilters,
  type NotificationKind,
  type NotificationRow,
} from "./types";

// ─── Defaults ────────────────────────────────────────────────────────────
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

// ─── List ────────────────────────────────────────────────────────────────
export async function listNotifications(
  userId: string,
  limit = DEFAULT_LIMIT,
  filters: NotificationFilters = {}
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const effectiveLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  let query = supabase
    .from("notifications")
    .select("id, user_id, title, body, kind, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(effectiveLimit);

  if (filters.unreadOnly) {
    query = query.is("read_at", null);
  }
  if (filters.kinds && filters.kinds.length > 0) {
    query = query.in("kind", filters.kinds);
  }
  if (filters.since) {
    query = query.gte("created_at", filters.since);
  }
  if (filters.until) {
    query = query.lte("created_at", filters.until);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as NotificationRow[];
}

// ─── Cursor pagination ───────────────────────────────────────────────────
export interface NotificationPage {
  items: NotificationRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function listNotificationsPage(
  userId: string,
  cursor: string | null = null,
  limit = DEFAULT_LIMIT,
  filters: NotificationFilters = {}
): Promise<NotificationPage> {
  const supabase = await createClient();
  const effectiveLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  let query = supabase
    .from("notifications")
    .select("id, user_id, title, body, kind, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(effectiveLimit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.unreadOnly) {
    query = query.is("read_at", null);
  }
  if (filters.kinds && filters.kinds.length > 0) {
    query = query.in("kind", filters.kinds);
  }

  const { data, error } = await query;
  if (error) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const rows = (data ?? []) as NotificationRow[];
  const hasMore = rows.length > effectiveLimit;
  const items = hasMore ? rows.slice(0, effectiveLimit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? last.created_at : null;

  return { items, nextCursor, hasMore };
}

// ─── Unread count ────────────────────────────────────────────────────────
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

// ─── Aggregates ──────────────────────────────────────────────────────────
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

  const byKind: Record<NotificationKind, number> = { ...emptyByKind };
  let unread = 0;

  for (const row of data) {
    const kind = resolveKind(row.kind);
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (!row.read_at) unread += 1;
  }

  return { total: data.length, unread, byKind };
}

// ─── Fetch a single notification ─────────────────────────────────────────
export async function getNotification(
  userId: string,
  id: string
): Promise<NotificationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as NotificationRow;
}
