// lib/agents/status.ts
import { createClient } from "@/lib/supabase/server";
import { AGENTS, type AgentSlug } from "./registry";

export type AgentLiveStatus =
  | "idle" | "thinking" | "working"
  | "awaiting_approval" | "error" | "offline";

export interface AgentStatusSnapshot {
  slug: AgentSlug;
  status: AgentLiveStatus;
  lastRunAt: string | null;
  runsToday: number;
  pendingApprovals: number;
}

function agentMatchesSlug(agentName: string, slug: AgentSlug): boolean {
  const n = agentName.toLowerCase();
  if (n.includes(slug)) return true;
  // siddhi is stored as "siddhi-supervisor" by the supervisor worker
  if (slug === "siddhi" && n.includes("siddhi")) return true;
  return false;
}

export async function getAgentStatuses(
  userId: string
): Promise<AgentStatusSnapshot[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [runsRes, approvalsRes] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("agent_name, status, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("agent_name")
      .eq("user_id", userId)
      .eq("status", "pending"),
  ]);

  const runs = runsRes.data ?? [];
  const approvals = approvalsRes.data ?? [];

  return AGENTS.map((agent) => {
    const mine = runs.filter((r) => agentMatchesSlug(r.agent_name, agent.slug));
    const latest = mine[0];
    const pending = approvals.filter((a) =>
      agentMatchesSlug(a.agent_name, agent.slug)
    ).length;

    let status: AgentLiveStatus = "idle";
    if (latest) {
      switch (latest.status) {
        case "running":          status = "working"; break;
        case "pending_approval": status = "awaiting_approval"; break;
        case "failed":           status = "error"; break;
        case "completed":        status = "idle"; break;
        default:                 status = "idle";
      }
    }

    return {
      slug: agent.slug,
      status,
      lastRunAt: latest?.created_at ?? null,
      runsToday: mine.length,
      pendingApprovals: pending,
    };
  });
}
