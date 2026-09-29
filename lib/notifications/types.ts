// lib/notifications/types.ts
// ─────────────────────────────────────────────────────────────────────────
// Notification type surface — single source of truth for the notification
// domain. Re-exports the canonical row shape from lib/supabase/types so
// components never import from the generator directly.
// ─────────────────────────────────────────────────────────────────────────
import type { Database } from "@/lib/supabase/types";

// ─── Canonical row shapes ────────────────────────────────────────────────
export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate =
  Database["public"]["Tables"]["notifications"]["Update"];

// ─── Kinds (must match the DB CHECK constraint in migration 011) ─────────
export type NotificationKind =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "approval"
  | "signal"
  | "call"
  | "content";

export const NOTIFICATION_KINDS: readonly NotificationKind[] = [
  "info",
  "success",
  "warning",
  "error",
  "approval",
  "signal",
  "call",
  "content",
] as const;

// ─── Style tokens (Tailwind class fragments, palette-locked) ─────────────
// Palette is locked: violet=action, blue=running, emerald=success,
// amber=warning, rose=error. Nothing else allowed.
export const KIND_STYLE: Record<NotificationKind, string> = {
  info:     "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  success:  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning:  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error:    "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  approval: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  signal:   "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  call:     "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  content:  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

export const KIND_DOT: Record<NotificationKind, string> = {
  info:     "bg-sky-500",
  success:  "bg-emerald-500",
  warning:  "bg-amber-500",
  error:    "bg-rose-500",
  approval: "bg-violet-500",
  signal:   "bg-amber-500",
  call:     "bg-blue-500",
  content:  "bg-indigo-500",
};

export const KIND_LABEL: Record<NotificationKind, string> = {
  info:     "Info",
  success:  "Success",
  warning:  "Warning",
  error:    "Error",
  approval: "Approval",
  signal:   "Signal",
  call:     "Call",
  content:  "Content",
};

// ─── Guards ──────────────────────────────────────────────────────────────
export function isNotificationKind(v: unknown): v is NotificationKind {
  return (
    typeof v === "string" &&
    (NOTIFICATION_KINDS as readonly string[]).includes(v)
  );
}

export function resolveKind(v: string | null | undefined): NotificationKind {
  return isNotificationKind(v) ? v : "info";
}

// ─── Query filter shape ──────────────────────────────────────────────────
export interface NotificationFilters {
  unreadOnly?: boolean;
  kinds?: NotificationKind[];
  since?: string;
  until?: string;
}

// ─── Aggregate shape ─────────────────────────────────────────────────────
export interface NotificationAggregate {
  total: number;
  unread: number;
  byKind: Record<NotificationKind, number>;
}
