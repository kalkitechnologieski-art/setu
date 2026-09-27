import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BarChart3, DollarSign, ShieldCheck, Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getFleetSummary, getAgents, getAgentMetrics, getGovernanceEvents,
} from "@/lib/ops/queries";
import { AgentGridCard } from "@/components/ops/agent-grid-card";
import { LiveActivityFeed, type ActivityItem } from "@/components/ops/live-activity-feed";
import { GovernanceScore } from "@/components/ops/governance-score";
import { CostDonut, type CostSlice } from "@/components/ops/cost-donut";
import { JointDashboard } from "@/components/ops/joint-dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function OpsCenterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ops");

  const [summary, agents, metrics, govEvents] = await Promise.all([
    getFleetSummary(user.id),
    getAgents(user.id),
    getAgentMetrics(user.id, 24),
    getGovernanceEvents(user.id, 20),
  ]);

  // Build recent activity feed from metrics + governance events
  const activity: ActivityItem[] = govEvents.slice(0, 8).map((e) => ({
    id: `gov-${e.id}`,
    agentSlug: "system",
    agentName: e.actor_id,
    action: e.summary,
    status: e.severity === "critical"
      ? "error"
      : e.severity === "warning"
      ? "pending"
      : "info",
    at: new Date(e.created_at).toLocaleTimeString(),
  }));

  // Cost distribution by agent
  const costByAgent = new Map<string, number>();
  for (const m of metrics) {
    costByAgent.set(m.agent_slug, (costByAgent.get(m.agent_slug) ?? 0) + Number(m.cost_usd));
  }
  const sliceColors: Record<string, string> = {
    arjun: "#8b5cf6",
    meera: "#3b82f6",
    kabir: "#10b981",
    siddhi: "#f59e0b",
  };
  const costSlices: CostSlice[] = Array.from(costByAgent.entries()).map(
    ([slug, value]) => ({
      name: slug,
      value,
      color: sliceColors[slug] ?? "#94a3b8",
    })
  );

  // Governance score: derive from HITL ratio + failure + incidents
  const humanReviewPct = summary.runsToday > 0
    ? Math.min(100, Math.round((summary.pendingApprovals / summary.runsToday) * 100))
    : 100;
  const incidents24h = govEvents.filter((e) => e.severity === "critical").length;
  const govScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100
        - summary.failureRate * 2
        - incidents24h * 5
        + (humanReviewPct >= 10 ? 5 : 0)
      )
    )
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Operations Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Live view of your AI workforce. Every action, every approval, every cost — on one screen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ops/governance">
              <ShieldCheck className="size-4" /> Audit log
            </Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href="/ops/registry">
              <Zap className="size-4" /> Manage agents
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
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
          icon={BarChart3}
          accent="blue"
          hint="24h window"
        />
        <StatCard
          label="Cost today"
          value={`$${summary.costTodayUsd.toFixed(2)}`}
          icon={DollarSign}
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

      {/* Main grid: agents + side panel */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Agent grid (2/3) */}
        <section className="space-y-3 lg:col-span-2">
          <header className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agent fleet
            </h2>
            <Link
              href="/ops/activity"
              className="text-xs font-medium text-primary hover:underline"
            >
              Full activity →
            </Link>
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
                  runsToday={0}
                  costTodayUsd={costByAgent.get(a.slug) ?? 0}
                  pendingApprovals={0}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No agents registered yet. Complete onboarding to seed the default fleet.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/onboarding">Run onboarding</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Right column: governance + cost + activity */}
        <aside className="space-y-4">
          <GovernanceScore
            score={govScore}
            humanReviewPct={humanReviewPct}
            costOnBudget={summary.costTodayUsd < 100}
            incidents24h={incidents24h}
          />

          {costSlices.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold tracking-tight">
                Cost distribution
              </h3>
              <p className="text-[10px] text-muted-foreground">
                By agent, last 24 hours
              </p>
              <div className="mt-3">
                <CostDonut data={costSlices} />
              </div>
            </div>
          )}

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
            <div className="mt-3 max-h-[320px] overflow-y-auto pr-1">
              <LiveActivityFeed items={activity} />
            </div>
          </div>
        </aside>
      </div>

      {/* Joint dashboard */}
      <JointDashboard
        metrics={[
          { label: "Outbound touches", human: 124, agent: 892 },
          { label: "Meetings booked",  human: 18,  agent: 47  },
          { label: "Emails sent",      human: 42,  agent: 1840 },
          { label: "Deals advanced",   human: 12,  agent: 31  },
        ]}
      />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { href: "/ops/approvals",  label: "Approvals",   desc: "HITL queue" },
          { href: "/ops/activity",   label: "Activity",    desc: "Live trace" },
          { href: "/ops/registry",   label: "Registry",    desc: "Agent config" },
          { href: "/ops/governance", label: "Governance",  desc: "Audit log" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="text-sm font-semibold tracking-tight">{l.label}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{l.desc}</span>
              <ArrowRight className="size-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
