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
