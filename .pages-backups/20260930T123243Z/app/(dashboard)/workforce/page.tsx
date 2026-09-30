import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAgents, getAgentMetrics } from "@/lib/ops/queries";
import { AgentGridCard } from "@/components/ops/agent-grid-card";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

export default async function WorkforcePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/workforce");

  let agents: Awaited<ReturnType<typeof getAgents>> = [];
  let metrics: Awaited<ReturnType<typeof getAgentMetrics>> = [];
  try {
    [agents, metrics] = await Promise.all([getAgents(user.id), getAgentMetrics(user.id, 24 * 7)]);
  } catch (e) { console.error("[workforce]", e); }

  const metricsBySlug = new Map<string, { runs: number; cost: number }>();
  for (const m of metrics) {
    const c = metricsBySlug.get(m.agent_slug) ?? { runs: 0, cost: 0 };
    c.runs += m.runs_started;
    c.cost += Number(m.cost_usd);
    metricsBySlug.set(m.agent_slug, c);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Workforce</h1>
        <p className="text-sm text-muted-foreground">
          {agents.length > 0 ? `${agents.length} AI employees running your revenue motions.` : "Your AI team will appear here once agents are seeded."}
        </p>
      </div>
      {agents.length === 0 ? (
        <EmptyState icon={Sparkles} title="No agents yet" description="Your workforce will be seeded on your first signup." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((a) => {
            const m = metricsBySlug.get(a.slug) ?? { runs: 0, cost: 0 };
            return (
              <AgentGridCard key={a.id} slug={a.slug} name={a.name} role={a.role}
                description={a.description} icon={a.icon} autonomy={a.autonomy}
                status={a.status} runsToday={m.runs} costTodayUsd={m.cost} />
            );
          })}
        </div>
      )}
    </div>
  );
}
