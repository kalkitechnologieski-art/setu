// lib/ops/queries.ts
import { createClient } from "@/lib/supabase/server";
import type {
  AgentRegistryRow,
  AgentMetricRow,
  ApprovalChainRow,
  GovernanceEventRow,
} from "./types";

// ─── Types ────────────────────────────────────────────────────────────────

export interface FleetSummary {
  totalAgents: number;
  activeAgents: number;
  runsToday: number;
  costTodayUsd: number;
  pendingApprovals: number;
  failureRate: number;
}

export interface DashboardSummary {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  activeCampaigns: number;
  pendingApprovals: number;
  runsToday: number;
  costTodayUsd: number;
  spend30d: number;
  conversions30d: number;
  avgRoas: number;
}

export interface RecentActivity {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  severity: string;
  summary: string;
  createdAt: string;
}

export interface UnifiedInboxItem {
  id: string;
  kind: "approval" | "signal" | "call";
  title: string;
  subtitle: string;
  timestamp: string;
  agentSlug: string;
  urgency: string;
  confidence: number | null;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrev: number | null;
}

export interface CohortRow {
  cohort: string;
  weeks: Array<{ week: number; pct: number | null }>;
}

export interface AgentRunHistoryRow {
  id: string;
  agentName: string;
  status: string;
  tokensUsed: number;
  durationMs: number;
  createdAt: string;
}

export interface PlatformBreakdown {
  platform: string;
  spend: number;
  conversions: number;
  roas: number;
  share: number;
}

// ─── Existing exports (preserved) ─────────────────────────────────────────

export async function getFleetSummary(userId: string): Promise<FleetSummary> {
  const supabase = await createClient();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [agentsRes, metricsRes, approvalsRes] = await Promise.all([
    supabase.from("agent_registry").select("status").eq("user_id", userId),
    supabase
      .from("agent_metrics")
      .select("runs_started, runs_completed, runs_failed, cost_usd")
      .eq("user_id", userId)
      .gte("bucket", dayStart.toISOString()),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
  ]);

  const agents = agentsRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const runsToday = metrics.reduce((s, m) => s + m.runs_started, 0);
  const costTodayUsd = metrics.reduce((s, m) => s + Number(m.cost_usd), 0);
  const failures = metrics.reduce((s, m) => s + m.runs_failed, 0);

  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "active").length,
    runsToday,
    costTodayUsd,
    pendingApprovals: approvalsRes.count ?? 0,
    failureRate: runsToday > 0 ? (failures / runsToday) * 100 : 0,
  };
}

export async function getAgents(userId: string): Promise<AgentRegistryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_registry")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as AgentRegistryRow[];
}

export async function getAgentMetrics(
  userId: string,
  hours = 24
): Promise<AgentMetricRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("agent_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("bucket", since)
    .order("bucket", { ascending: true });
  if (error) return [];
  return (data ?? []) as AgentMetricRow[];
}

export async function getPendingChains(
  userId: string
): Promise<ApprovalChainRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_chains")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return [];
  return (data ?? []) as ApprovalChainRow[];
}

export async function getGovernanceEvents(
  userId: string,
  limit = 100
): Promise<GovernanceEventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("governance_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as GovernanceEventRow[];
}

// ─── New exports (Phase 1) ────────────────────────────────────────────────

export async function getDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  const supabase = await createClient();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [leadsRes, campaignsRes, approvalsRes, metricsRes, perfRes] =
    await Promise.all([
      supabase.from("leads").select("status").eq("user_id", userId),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending"),
      supabase
        .from("agent_metrics")
        .select("runs_started, cost_usd")
        .eq("user_id", userId)
        .gte("bucket", dayStart.toISOString()),
      supabase
        .from("ad_performance")
        .select("spend, conversions, roas")
        .eq("user_id", userId)
        .gte("synced_at", thirtyDaysAgo.toISOString()),
    ]);

  const leads = leadsRes.data ?? [];
  const metrics = metricsRes.data ?? [];
  const perf = perfRes.data ?? [];

  const spend30d = perf.reduce((s, p) => s + Number(p.spend), 0);
  const conversions30d = perf.reduce((s, p) => s + p.conversions, 0);
  const avgRoas =
    perf.length > 0
      ? perf.reduce((s, p) => s + Number(p.roas), 0) / perf.length
      : 0;

  return {
    totalLeads: leads.length,
    qualifiedLeads: leads.filter((l) => l.status === "qualified").length,
    convertedLeads: leads.filter((l) => l.status === "converted").length,
    activeCampaigns: campaignsRes.count ?? 0,
    pendingApprovals: approvalsRes.count ?? 0,
    runsToday: metrics.reduce((s, m) => s + m.runs_started, 0),
    costTodayUsd: metrics.reduce((s, m) => s + Number(m.cost_usd), 0),
    spend30d,
    conversions30d,
    avgRoas,
  };
}

export async function getRecentActivity(
  userId: string,
  limit = 10
): Promise<RecentActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("governance_events")
    .select("id, actor_type, actor_id, event_type, severity, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((e) => ({
    id: String(e.id),
    actorType: e.actor_type,
    actorId: e.actor_id,
    eventType: e.event_type,
    severity: e.severity,
    summary: e.summary,
    createdAt: e.created_at,
  }));
}

export async function getUnifiedInbox(
  userId: string,
  limit = 50
): Promise<UnifiedInboxItem[]> {
  const supabase = await createClient();

  const [approvalsRes, signalsRes, callsRes] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, agent_name, action, payload, confidence, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("signals")
      .select("id, title, description, source, urgency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("calls")
      .select("id, summary, sentiment, duration_seconds, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: UnifiedInboxItem[] = [];

  for (const a of approvalsRes.data ?? []) {
    items.push({
      id: `approval-${a.id}`,
      kind: "approval",
      title: a.action,
      subtitle: `by ${a.agent_name}`,
      timestamp: a.created_at,
      agentSlug: a.agent_name.split("-")[0] ?? "siddhi",
      urgency: "high",
      confidence: a.confidence === null ? null : Number(a.confidence),
    });
  }

  for (const s of signalsRes.data ?? []) {
    items.push({
      id: `signal-${s.id}`,
      kind: "signal",
      title: s.title,
      subtitle: s.description ?? s.source,
      timestamp: s.created_at,
      agentSlug: "arjun",
      urgency: s.urgency ?? "medium",
      confidence: null,
    });
  }

  for (const c of callsRes.data ?? []) {
    items.push({
      id: `call-${c.id}`,
      kind: "call",
      title: c.summary ?? "Call completed",
      subtitle: `${c.sentiment ?? "neutral"} · ${c.duration_seconds ?? 0}s`,
      timestamp: c.created_at,
      agentSlug: "meera",
      urgency: "medium",
      confidence: null,
    });
  }

  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, limit);
}

export async function getFunnelData(userId: string): Promise<FunnelStage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("status")
    .eq("user_id", userId);
  if (error) return [];

  const leads = data ?? [];
  const counts = {
    captured: leads.length,
    contacted: leads.filter((l) =>
      ["contacted", "qualified", "converted"].includes(l.status)
    ).length,
    qualified: leads.filter((l) =>
      ["qualified", "converted"].includes(l.status)
    ).length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  const stages: FunnelStage[] = [
    { stage: "Captured", count: counts.captured, conversionFromPrev: null },
    {
      stage: "Contacted",
      count: counts.contacted,
      conversionFromPrev:
        counts.captured > 0
          ? (counts.contacted / counts.captured) * 100
          : null,
    },
    {
      stage: "Qualified",
      count: counts.qualified,
      conversionFromPrev:
        counts.contacted > 0
          ? (counts.qualified / counts.contacted) * 100
          : null,
    },
    {
      stage: "Converted",
      count: counts.converted,
      conversionFromPrev:
        counts.qualified > 0
          ? (counts.converted / counts.qualified) * 100
          : null,
    },
  ];

  return stages;
}

export async function getCohortData(userId: string): Promise<CohortRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("created_at, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];

  const leads = data ?? [];
  if (leads.length === 0) return [];

  // Build weekly cohorts — group leads by ISO week
  const cohorts = new Map<string, { total: number; converted: number }>();
  for (const l of leads) {
    const d = new Date(l.created_at);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const c = cohorts.get(key) ?? { total: 0, converted: 0 };
    c.total += 1;
    if (l.status === "converted") c.converted += 1;
    cohorts.set(key, c);
  }

  return Array.from(cohorts.entries())
    .slice(-6)
    .map(([key, v]) => ({
      cohort: new Date(key).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
      }),
      weeks: Array.from({ length: 6 }).map((_, i) => ({
        week: i,
        pct: i === 0 ? 100 : v.total > 0 ? (v.converted / v.total) * 100 : null,
      })),
    }));
}

export async function getAgentRunHistory(
  userId: string,
  agentSlug: string,
  limit = 50
): Promise<AgentRunHistoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_runs")
    .select("id, agent_name, status, tokens_used, duration_ms, created_at")
    .eq("user_id", userId)
    .ilike("agent_name", `%${agentSlug}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    agentName: r.agent_name,
    status: r.status,
    tokensUsed: r.tokens_used,
    durationMs: r.duration_ms,
    createdAt: r.created_at,
  }));
}

export async function getPlatformBreakdown(
  userId: string
): Promise<PlatformBreakdown[]> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("ad_performance")
    .select("platform, spend, conversions, roas")
    .eq("user_id", userId)
    .gte("synced_at", thirtyDaysAgo.toISOString());
  if (error) return [];

  const byPlatform = new Map<
    string,
    { spend: number; conversions: number; roas: number }
  >();
  for (const row of data ?? []) {
    const p = byPlatform.get(row.platform) ?? {
      spend: 0,
      conversions: 0,
      roas: 0,
    };
    p.spend += Number(row.spend);
    p.conversions += row.conversions;
    p.roas += Number(row.roas);
    byPlatform.set(row.platform, p);
  }

  const totalSpend = Array.from(byPlatform.values()).reduce(
    (s, v) => s + v.spend,
    0
  );

  return Array.from(byPlatform.entries())
    .map(([platform, v]) => ({
      platform,
      spend: v.spend,
      conversions: v.conversions,
      roas: v.roas,
      share: totalSpend > 0 ? (v.spend / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}
