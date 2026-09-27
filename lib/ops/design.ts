// lib/ops/design.ts
// ═══════════════════════════════════════════════════════════════════════════
// Design tokens for the Operations Center.
//
// Palette inspired by Attio (data-dense precision) and Linear (dark-first
// restraint). Every value here is intentional — no invented colors.
// ═══════════════════════════════════════════════════════════════════════════

export const ACCENT_BY_AUTONOMY = {
  suggest:        { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",         ring: "ring-sky-500/20" },
  confirm:        { bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     ring: "ring-amber-500/20" },
  auto_with_rules:{ bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  autonomous:     { bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400",   ring: "ring-violet-500/20" },
} as const;

export const ACCENT_BY_STATUS = {
  active:     { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
  paused:     { bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400" },
  deprecated: { bg: "bg-muted",          text: "text-muted-foreground" },
} as const;

export const ACCENT_BY_SEVERITY = {
  info:     { bg: "bg-sky-500/10",   text: "text-sky-600 dark:text-sky-400" },
  warning:  { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
  critical: { bg: "bg-rose-500/10",  text: "text-rose-600 dark:text-rose-400" },
} as const;

export const ACCENT_BY_AGENT: Record<string, string> = {
  arjun:  "from-violet-500 to-indigo-500",
  meera:  "from-blue-500 to-cyan-500",
  kabir:  "from-emerald-500 to-teal-500",
  siddhi: "from-amber-500 to-orange-500",
};

export function agentGradient(slug: string): string {
  return ACCENT_BY_AGENT[slug] ?? "from-slate-500 to-zinc-500";
}
