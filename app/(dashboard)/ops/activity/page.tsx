import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGovernanceEvents } from "@/lib/ops/queries";
import { LiveActivityFeed, type ActivityItem } from "@/components/ops/live-activity-feed";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops/activity");

  const events = await getGovernanceEvents(user.id, 200);
  const items: ActivityItem[] = events.map((e) => ({
    id: `ev-${e.id}`,
    agentSlug: e.actor_id,
    agentName: e.actor_id,
    action: e.summary,
    status: e.severity === "critical" ? "error" : e.severity === "warning" ? "pending" : "info",
    at: new Date(e.created_at).toLocaleString(),
  }));

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <Link href="/ops" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> Back to Operations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Full event stream across all agents. {events.length} events in the recent window.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <LiveActivityFeed items={items} />
        </div>
      </div>
    </div>
  );
}
