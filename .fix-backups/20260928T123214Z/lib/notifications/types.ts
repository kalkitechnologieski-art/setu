// lib/notifications/types.ts
import type { Database } from "@/lib/supabase/types";

export type NotificationRow =
  Database["public"]["Tables"]["notifications"]["Row"];

export type NotificationKind =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "approval"
  | "signal"
  | "call"
  | "content";

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
