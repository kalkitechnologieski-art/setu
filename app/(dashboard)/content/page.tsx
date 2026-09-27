import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listContentPosts, getContentStats } from "@/lib/content/queries";
import { PostCard } from "@/components/content/post-card";
import { ContentActions } from "@/components/content/content-actions";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/content");

  const [posts, stats] = await Promise.all([
    listContentPosts(user.id, 100),
    getContentStats(user.id),
  ]);

  const kpis = [
    { label: "Total",     value: stats.total },
    { label: "Drafts",    value: stats.draft },
    { label: "Scheduled", value: stats.scheduled },
    { label: "Awaiting",  value: stats.pending },
    { label: "Published", value: stats.published },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            {posts.length === 0
              ? "Schedule and manage posts across every platform."
              : `${posts.length} post${posts.length === 1 ? "" : "s"} across your channels.`}
          </p>
        </div>
        <ContentActions />
      </div>

      {posts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border bg-card p-3">
              <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {k.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No posts yet"
          description="Draft your first post and schedule it across Instagram, Facebook, YouTube, LinkedIn and TikTok — from one screen."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
