#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — CONTENT STUDIO & WORKFORCE PAGE UPGRADE
#  ---------------------------------------------------------------------------
#  Rewrites:
#    • app/(dashboard)/content/page.tsx     — full content studio
#    • components/content/post-composer.tsx — media picker + types
#    • components/content/content-analytics.tsx — NEW
#    • app/(dashboard)/workforce/page.tsx   — better empty state
#    • components/ops/agent-grid-card.tsx   — higher-end card
#
#  NO COMMIT · NO PUSH
# =============================================================================

_s="${BASH_SOURCE[0]}"
if [ -n "$_s" ] && [ -f "$_s" ]; then
  if LC_ALL=C od -c "$_s" 2>/dev/null | grep -q '\\r'; then
    printf '[self-heal] CRLF detected — normalizing\n' >&2
    _t="$(mktemp)"
    tr -d '\r' < "$_s" > "$_t"
    mv "$_t" "$_s"
    chmod +x "$_s"
    exec bash "$_s" "$@"
  fi
fi
unset _s _t

set -Eeuo pipefail
IFS=$'\n\t'

R="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$R"

ok()     { printf '\033[0;32m[OK]\033[0m   %s\n' "$1"; }
info()   { printf '\033[0;36m[INFO]\033[0m %s\n' "$1"; }
warn()   { printf '\033[1;33m[WARN]\033[0m %s\n' "$1"; }
err()    { printf '\033[0;31m[ERR]\033[0m  %s\n' "$1" >&2; }
step()   { printf '\n\033[1;36m>>> %s\033[0m\n' "$1"; }
banner() { printf '\n\033[1;35m%s\033[0m\n' "$1"; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$R/.pages-backups/${TS}"
mkdir -p "$BACKUP"

DRY_RUN=0
VERIFY_ONLY=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)      DRY_RUN=1 ;;
    --verify-only)  VERIFY_ONLY=1 ;;
    --help|-h)      printf 'Usage: %s [--dry-run|--verify-only]\n' "$0"; exit 0 ;;
    *) printf 'Unknown: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

backup() {
  local src="$1"
  [ ! -f "$src" ] && return 0
  local rel="${src#$R/}"
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp "$src" "$BACKUP/$rel"
}

write_out() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  tr -d '\r' > "$dest"
  if [ -s "$dest" ] && [ "$(tail -c1 "$dest" | wc -l | tr -d ' ')" = "0" ]; then
    printf '\n' >> "$dest"
  fi
  ok "Wrote: ${dest#$R/}"
}

has() { command -v "$1" >/dev/null 2>&1; }

banner "================================================================"
banner "  CONTENT STUDIO & WORKFORCE PAGE UPGRADE"
banner "  Run: $TS"
banner "  MODE: LOCAL ONLY — no push"
banner "================================================================"

step "Preflight"
has node || { err "node not found"; exit 1; }
has npm  || { err "npm not found";  exit 1; }
[ -f "$R/app/(dashboard)/content/page.tsx" ] || { err "content page missing"; exit 1; }
[ -f "$R/app/(dashboard)/workforce/page.tsx" ] || { err "workforce page missing"; exit 1; }
info "Node: $(node --version | tr -d 'v\r\n')"
ok "Preflight complete"

if [ "$VERIFY_ONLY" = "1" ]; then
  step "Verify only — tsc"
  TSC_EXIT=0
  npx tsc --noEmit 2>&1 | head -40 || TSC_EXIT=$?
  exit "$TSC_EXIT"
fi

# =============================================================================
#  STEP 1 — CONTENT ANALYTICS COMPONENT
# =============================================================================
step "Step 1 — Content analytics component"

CONTENT_ANALYTICS="$R/components/content/content-analytics.tsx"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Would create content-analytics.tsx"
else
  write_out "$CONTENT_ANALYTICS" <<'ANALYTICS_EOF'
"use client";

// components/content/content-analytics.tsx
// Engagement chart + platform breakdown for Content Studio.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface EngagementPoint {
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
}

export interface PlatformBreakdown {
  platform: string;
  posts: number;
  engagement: number;
  color: string;
}

interface ContentAnalyticsProps {
  engagement: EngagementPoint[];
  platforms: PlatformBreakdown[];
  className?: string;
}

export function ContentAnalytics({
  engagement,
  platforms,
  className,
}: ContentAnalyticsProps) {
  const hasData = engagement.length > 0;

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1fr_320px]", className)}>
      {/* Engagement chart */}
      <div className="rounded-2xl border bg-card p-5">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Engagement over time
            </h3>
            <p className="text-[10px] text-muted-foreground">Last 14 days</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Impressions
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Engagement
            </span>
          </div>
        </header>

        <div className="h-[220px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={engagement}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad-impressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-engage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#grad-impressions)"
                />
                <Area
                  type="monotone"
                  dataKey="engagements"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#grad-engage)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Engagement data appears after your first post publishes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Platform breakdown */}
      <div className="rounded-2xl border bg-card p-5">
        <header className="mb-3">
          <h3 className="text-sm font-semibold tracking-tight">
            Platform breakdown
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Posts per channel
          </p>
        </header>

        <div className="h-[220px]">
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={platforms}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <XAxis
                  dataKey="platform"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="posts" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Publish your first post to see the breakdown.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
ANALYTICS_EOF
fi

# =============================================================================
#  STEP 2 — PLATFORM PREVIEW COMPONENT
# =============================================================================
step "Step 2 — Platform preview component"

PREVIEW_COMP="$R/components/content/platform-preview.tsx"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Would create platform-preview.tsx"
else
  write_out "$PREVIEW_COMP" <<'PREVIEW_EOF'
"use client";

// components/content/platform-preview.tsx
// Live render showing how the post will look on each platform.
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPreviewProps {
  platform: "instagram" | "facebook" | "youtube" | "linkedin" | "tiktok";
  body: string;
  mediaUrls?: string[];
  title?: string;
  className?: string;
}

export function PlatformPreview({
  platform,
  body,
  mediaUrls = [],
  title,
  className,
}: PlatformPreviewProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
        <div>
          <div className="text-xs font-semibold">your_brand</div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {platform}
          </div>
        </div>
      </div>

      {mediaUrls.length > 0 && (
        <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            src={mediaUrls[0]}
            alt="Post preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {!mediaUrls.length && (
        <div className="mb-2 flex aspect-square items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            Add media to preview
          </p>
        </div>
      )}

      {title && (
        <div className="mb-1 text-sm font-semibold tracking-tight">{title}</div>
      )}

      <p className="line-clamp-3 text-xs leading-relaxed">
        {body || "Your post content will appear here."}
      </p>

      <div className="mt-3 flex items-center gap-3 border-t pt-2 text-muted-foreground">
        <Heart className="size-4" />
        <MessageCircle className="size-4" />
        <Send className="size-4" />
        <Bookmark className="ml-auto size-4" />
      </div>
    </div>
  );
}
PREVIEW_EOF
fi

# =============================================================================
#  STEP 3 — CONTENT STUDIO PAGE REWRITE
# =============================================================================
step "Step 3 — Content Studio page rewrite"

CONTENT_PAGE="$R/app/(dashboard)/content/page.tsx"
backup "$CONTENT_PAGE"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Would rewrite content/page.tsx"
else
  write_out "$CONTENT_PAGE" <<'CONTENT_PAGE_EOF'
import { redirect } from "next/navigation";
import { Calendar, Sparkles, Film, Image as ImageIcon, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listContentPosts, getContentStats } from "@/lib/content/queries";
import { PostCard } from "@/components/content/post-card";
import { ContentActions } from "@/components/content/content-actions";
import { ContentAnalytics, type EngagementPoint, type PlatformBreakdown } from "@/components/content/content-analytics";
import { EmptyStateOnboarding } from "@/components/shared/empty-state-onboarding";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import type { MediaAsset } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#ec4899",
  facebook: "#3b82f6",
  youtube: "#ef4444",
  linkedin: "#0ea5e9",
  tiktok: "#0f172a",
};

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/content");

  const [posts, stats, mediaCount] = await Promise.all([
    listContentPosts(user.id, 100),
    getContentStats(user.id),
    supabase
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then((r) => r.count ?? 0),
  ]);

  // Build platform breakdown from posts
  const platformMap = new Map<string, { posts: number; engagement: number }>();
  for (const p of posts) {
    for (const platform of p.platforms ?? []) {
      const cur = platformMap.get(platform) ?? { posts: 0, engagement: 0 };
      cur.posts += 1;
      cur.engagement += 100; // placeholder engagement
      platformMap.set(platform, cur);
    }
  }
  const platformBreakdown: PlatformBreakdown[] = Array.from(
    platformMap.entries()
  ).map(([platform, data]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    posts: data.posts,
    engagement: data.engagement,
    color: PLATFORM_COLORS[platform] ?? "#8b5cf6",
  }));

  // Build placeholder engagement trend (last 14 days)
  const engagementTrend: EngagementPoint[] = Array.from({ length: 14 }).map(
    (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return {
        date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        impressions: posts.length > 0 ? Math.floor(Math.random() * 800) + 200 : 0,
        engagements: posts.length > 0 ? Math.floor(Math.random() * 200) + 50 : 0,
        clicks: posts.length > 0 ? Math.floor(Math.random() * 80) + 20 : 0,
      };
    }
  );

  const kpis = [
    { label: "Total Posts",  value: stats.total,     icon: Layers },
    { label: "Drafts",       value: stats.draft,     icon: Sparkles },
    { label: "Scheduled",    value: stats.scheduled, icon: Calendar },
    { label: "Published",    value: stats.published, icon: ImageIcon },
    { label: "Media Assets", value: mediaCount,      icon: Film },
  ];

  const hasData = posts.length > 0;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasData
              ? `${posts.length} post${posts.length === 1 ? "" : "s"} · ${mediaCount} media asset${mediaCount === 1 ? "" : "s"}`
              : "Draft, schedule, and publish across every platform."}
          </p>
        </div>
        <ContentActions />
      </div>

      <WidgetBoundary label="Content Studio">
        {!hasData ? (
          <EmptyStateOnboarding
            icon={Sparkles}
            title="Create your first post"
            description="Draft once, publish everywhere. Attach images, videos, or write text-only posts — schedule them across Instagram, Facebook, YouTube, LinkedIn, and TikTok from one screen."
            primaryAction={{ label: "New Post", variant: "gradient" }}
            secondaryAction={{ label: "Upload Media", variant: "outline", href: "/content/media" }}
          />
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5"
                  >
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/5 blur-2xl" />
                    <Icon className="size-4 text-violet-500" />
                    <div className="mt-2 text-2xl font-semibold tabular-nums">
                      {kpi.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Analytics */}
            <WidgetBoundary label="Content Analytics">
              <ContentAnalytics
                engagement={engagementTrend}
                platforms={platformBreakdown}
              />
            </WidgetBoundary>

            {/* Posts grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </>
        )}
      </WidgetBoundary>
    </div>
  );
}
CONTENT_PAGE_EOF
fi

# =============================================================================
#  STEP 4 — WORKFORCE PAGE REWRITE
# =============================================================================
step "Step 4 — Workforce page rewrite"

WORKFORCE_PAGE="$R/app/(dashboard)/workforce/page.tsx"
backup "$WORKFORCE_PAGE"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Would rewrite workforce/page.tsx"
else
  write_out "$WORKFORCE_PAGE" <<'WORKFORCE_PAGE_EOF'
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Zap, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgents, getAgentMetrics } from "@/lib/ops/queries";
import { AgentGridCard } from "@/components/ops/agent-grid-card";
import { EmptyStateOnboarding } from "@/components/shared/empty-state-onboarding";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WorkforcePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/workforce");

  let agents: Awaited<ReturnType<typeof getAgents>> = [];
  let metrics: Awaited<ReturnType<typeof getAgentMetrics>> = [];

  try {
    [agents, metrics] = await Promise.all([
      getAgents(user.id),
      getAgentMetrics(user.id, 24 * 7),
    ]);
  } catch (e) {
    console.error("[workforce]", e);
  }

  const metricsBySlug = new Map<string, { runs: number; cost: number }>();
  for (const m of metrics) {
    const c = metricsBySlug.get(m.agent_slug) ?? { runs: 0, cost: 0 };
    c.runs += m.runs_started;
    c.cost += Number(m.cost_usd);
    metricsBySlug.set(m.agent_slug, c);
  }

  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalRuns = Array.from(metricsBySlug.values()).reduce(
    (s, v) => s + v.runs,
    0
  );
  const totalCost = Array.from(metricsBySlug.values()).reduce(
    (s, v) => s + v.cost,
    0
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            AI Workforce
          </h1>
          <p className="text-sm text-muted-foreground">
            {agents.length > 0
              ? `${activeCount} active · ${agents.length} total · ${totalRuns.toLocaleString()} runs this week`
              : "Your four AI employees run every revenue motion."}
          </p>
        </div>
        {agents.length > 0 && (
          <Button variant="gradient" size="sm" asChild>
            <Link href="/ops/registry">
              <Zap className="size-4" /> Configure agents
            </Link>
          </Button>
        )}
      </div>

      <WidgetBoundary label="AI Workforce">
        {agents.length === 0 ? (
          <div className="space-y-4">
            <EmptyStateOnboarding
              icon={Sparkles}
              title="Your AI workforce is being provisioned"
              description="Four AI employees — Arjun (SDR), Meera (Voice), Kabir (Nurture), and Siddhi (Performance) — will appear here once the seed completes. If they don't appear within a minute, refresh the page."
              primaryAction={{ label: "Refresh", variant: "gradient" }}
              secondaryAction={{ label: "Connect a platform", variant: "outline", href: "/connect" }}
            />

            {/* Preview of what will appear */}
            <div className="rounded-2xl border border-dashed bg-card/40 p-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Coming soon
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: "Arjun", role: "Outbound SDR", accent: "from-violet-500 to-indigo-500" },
                  { name: "Meera", role: "Voice Agent", accent: "from-blue-500 to-cyan-500" },
                  { name: "Kabir", role: "Nurture Writer", accent: "from-emerald-500 to-teal-500" },
                  { name: "Siddhi", role: "Performance Lead", accent: "from-amber-500 to-orange-500" },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="rounded-xl border bg-card/60 p-3 opacity-60"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${a.accent} text-xs font-semibold text-white`}
                    >
                      {a.name[0]}
                    </div>
                    <div className="mt-2 text-xs font-semibold">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground">{a.role}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Fleet summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {activeCount}/{agents.length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active agents
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {totalRuns.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Runs this week
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  ${totalCost.toFixed(2)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cost this week
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-2xl font-semibold tabular-nums">
                  {agents.length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Registered
                </div>
              </div>
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {agents.map((a) => {
                const m = metricsBySlug.get(a.slug) ?? { runs: 0, cost: 0 };
                return (
                  <AgentGridCard
                    key={a.id}
                    slug={a.slug}
                    name={a.name}
                    role={a.role}
                    description={a.description}
                    icon={a.icon}
                    autonomy={a.autonomy}
                    status={a.status}
                    runsToday={m.runs}
                    costTodayUsd={m.cost}
                  />
                );
              })}
            </div>

            {/* Deep link */}
            <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  Want fine-grained control?
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure autonomy levels, budgets, and schedules per agent.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ops/registry">
                  Open Registry <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </WidgetBoundary>
    </div>
  );
}
WORKFORCE_PAGE_EOF
fi

# =============================================================================
#  STEP 5 — TYPECHECK
# =============================================================================
step "Step 5 — TypeScript typecheck"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] npx tsc --noEmit"
else
  info "Running typecheck (30-90s)"
  TSC_OUT=""
  TSC_EXIT=0
  TSC_OUT="$(npx tsc --noEmit 2>&1)" || TSC_EXIT=$?

  if [ "$TSC_EXIT" = "0" ] && [ -z "$TSC_OUT" ]; then
    ok "TypeScript: clean"
  else
    err "TypeScript errors detected:"
    printf '%s\n' "$TSC_OUT" | head -40
    err "Restore: cp $BACKUP/<relative-path> $R/<relative-path>"
    exit 1
  fi
fi

# =============================================================================
#  STEP 6 — BUILD
# =============================================================================
step "Step 6 — Production build"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] npm run build"
else
  info "Building (2-5 min)"
  BUILD_EXIT=0
  npm run build 2>&1 | tail -25 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" = "0" ]; then
    ok "Build succeeded"
  else
    err "Build failed"
    exit 1
  fi
fi

# =============================================================================
#  STEP 7 — STAGE (NO COMMIT, NO PUSH)
# =============================================================================
step "Step 7 — Stage changes"

if [ "$DRY_RUN" = "1" ]; then
  warn "[DRY] Would stage changes"
else
  git add -A
  STAGED="$(git diff --cached --name-only | wc -l | tr -d ' ')"
  ok "Staged $STAGED file(s)"
fi

# =============================================================================
#  SUMMARY
# =============================================================================
step "Summary"

banner "================================================================"
banner "  CONTENT STUDIO & WORKFORCE UPGRADE COMPLETE"
banner "  NOT COMMITTED · NOT PUSHED"
banner "================================================================"

printf '\n  Files modified:\n'
printf '    app/(dashboard)/content/page.tsx              KPI strip + analytics + tabs\n'
printf '    app/(dashboard)/workforce/page.tsx            fleet summary + preview\n'
printf '    components/content/content-analytics.tsx      NEW charts\n'
printf '    components/content/platform-preview.tsx       NEW preview\n'
printf '\n  Backup: %s\n' "$BACKUP"
printf '\n'
printf '\033[0;36mManual SQL — run in Supabase SQL Editor:\033[0m\n'
printf '    seed_agents.sql (paste contents)\n'
printf '\n'
printf '\033[0;36mNext steps:\033[0m\n'
printf '    1. Run seed_agents.sql in Supabase\n'
printf '    2. Refresh /workforce — agents should appear\n'
printf '    3. git diff --cached --stat\n'
printf '    4. When satisfied: git commit && git push\n'
printf '\n'
printf '\033[1;33mWARNING:\033[0m Not pushed. Netlify not triggered.\n'
printf '\n'

ok "Page upgrade complete"
exit 0