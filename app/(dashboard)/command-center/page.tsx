import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFleetSummary, getAgents, getPendingChains, getGovernanceEvents } from "@/lib/ops/queries";
import { AgentGridCard } from "@/components/ops/agent-grid-card";
import { LiveActivityFeed, type ActivityItem } from "@/components/ops/live-activity-feed";
import { GovernanceScore } from "@/components/ops/governance-score";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/premium/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/command-center");

  const [summary, agents, chains, events] = await Promise.all([
    getFleetSummary(user.id),
    getAgents(user.id),
    getPendingChains(user.id),
    getGovernanceEvents(user.id, 12),
  ]);

  const activity: ActivityItem[] = events.map((e) => ({
    id: `gov-${e.id}`,
    agentSlug: e.actor_id,
    agentName: e.actor_id,
    action: e.summary,
    status:
      e.severity === "critical"
        ? "error"
        : e.severity === "warning"
        ? "pending"
        : "info",
    at: new Date(e.created_at).toLocaleTimeString(),
  }));

  const humanReviewPct =
    summary.runsToday > 0
      ? Math.min(100, Math.round((summary.pendingApprovals / summary.runsToday) * 100))
      : 100;
  const incidents24h = events.filter((e) => e.severity === "critical").length;
  const govScore = Math.max(
    0,
    Math.min(100, Math.round(100 - summary.failureRate * 2 - incidents24h * 5))
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            AI Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Live view of your AI workforce. Every action, every approval, every cost.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ops/governance">
              <ShieldCheck className="size-4" /> Audit log
            </Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/workforce">
              <Zap className="size-4" /> Manage agents
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          label="Active agents"
          value={`${summary.activeAgents}/${summary.totalAgents}`}
          icon={Zap}
          accent="violet"
          hint="registered"
        />
        <StatCard
          label="Runs today"
          value={summary.runsToday.toLocaleString()}
          icon={ShieldCheck}
          accent="blue"
          hint="24h"
        />
        <StatCard
          label="Cost today"
          value={`$${summary.costTodayUsd.toFixed(2)}`}
          icon={ShieldCheck}
          accent="amber"
          hint="across agents"
        />
        <StatCard
          label="Pending decisions"
          value={summary.pendingApprovals}
          icon={ShieldCheck}
          accent="emerald"
          hint="awaiting you"
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agent fleet
            </h2>
          </header>
          {agents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {agents.map((a) => (
                <AgentGridCard
                  key={a.id}
                  slug={a.slug}
                  name={a.name}
                  role={a.role}
                  description={a.description}
                  icon={a.icon}
                  autonomy={a.autonomy}
                  status={a.status}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Zap}
              title="No agents yet"
              description="Your AI workforce will appear here once you connect a platform and start a campaign."
              action={
                <Button variant="gradient" size="sm" asChild>
                  <Link href="/connect">
                    Connect a platform <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              }
            />
          )}
        </section>

        <aside className="space-y-4">
          <GovernanceScore
            score={govScore}
            humanReviewPct={humanReviewPct}
            costOnBudget={summary.costTodayUsd < 100}
            incidents24h={incidents24h}
          />

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">
                Pending decisions
              </h3>
              {chains.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  {chains.length}
                </span>
              )}
            </div>
            {chains.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                No pending decisions.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {chains.slice(0, 4).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2"
                  >
                    <span className="truncate text-xs font-medium">
                      {c.required_role}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      step {c.step_index + 1}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">
                Live activity
              </h3>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                streaming
              </span>
            </div>
            <div className="mt-3 max-h-[280px] overflow-y-auto pr-1">
              <LiveActivityFeed items={activity} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
