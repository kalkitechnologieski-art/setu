// lib/content/types.ts
// ─────────────────────────────────────────────────────────────────────────
// Content Studio types. Re-exports the canonical ContentPost row shape so
// components can import from one place without depending on supabase/types.
// ─────────────────────────────────────────────────────────────────────────
import type { Database } from "@/lib/supabase/types";

export type ContentPost =
  Database["public"]["Tables"]["content_posts"]["Row"];
export type ContentPostRow = ContentPost;
export type ContentPostInsert =
  Database["public"]["Tables"]["content_posts"]["Insert"];
export type ContentPostUpdate =
  Database["public"]["Tables"]["content_posts"]["Update"];

export type ContentStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "published"
  | "rejected"
  | "failed";

export type PlatformSlug =
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "tiktok";

export interface PlatformMeta {
  slug: PlatformSlug;
  label: string;
  short: string;
  gradient: string;
}

export const PLATFORMS: readonly PlatformMeta[] = [
  { slug: "instagram", label: "Instagram", short: "IG", gradient: "from-pink-500 to-orange-500" },
  { slug: "facebook",  label: "Facebook",  short: "FB", gradient: "from-blue-500 to-blue-700" },
  { slug: "youtube",   label: "YouTube",   short: "YT", gradient: "from-red-500 to-red-700" },
  { slug: "linkedin",  label: "LinkedIn",  short: "LI", gradient: "from-sky-500 to-blue-700" },
  { slug: "tiktok",    label: "TikTok",    short: "TT", gradient: "from-slate-700 to-slate-900" },
] as const;

export const STATUS_STYLE: Record<ContentStatus, string> = {
  draft:            "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  scheduled:        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  published:        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected:         "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  failed:           "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft:            "Draft",
  pending_approval: "Awaiting",
  scheduled:        "Scheduled",
  published:        "Published",
  rejected:         "Rejected",
  failed:           "Failed",
};
