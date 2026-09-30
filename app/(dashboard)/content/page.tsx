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
