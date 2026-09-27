// lib/ops/queries.ts
// ═══════════════════════════════════════════════════════════════════════════
// Read-only queries powering the Operations Center.
// All queries are user-scoped — RLS enforces isolation, but we add the
// explicit .eq("user_id", ...) filter for plan stability.
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from "@/lib/supabase/server";
import type {
  AgentRegistryRow,
  AgentMetricRow,
  ApprovalChainRow,
  GovernanceEventRow,
} from "./types";

export interface FleetSummary {
  totalAgents: number;
  activeAgents: number;
  runsToday: number;
  costTodayUsd: number;
  pendingApprovals: number;
  failureRate: number;
}

export async function getFleetSummary(userId: string): Promise<FleetSummary> {
  const supabase = await createClient();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const [agentsRes, metricsRes, approvalsRes] = await Promise.all([
    supabase
      .from("agent_registry")
      .select("status")
      .eq("user_id", userId),
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
