// lib/agents/budget.ts
import { createClient } from "@/lib/supabase/server";

export interface AgentBudgetRow {
  agent_name: string;
  runs: number;
  cost_usd: number;
}

export async function getAgentBudgets(
  userId: string,
  days = 7
): Promise<AgentBudgetRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("agent_costs")
    .select("agent_name, runs, cost_usd")
    .eq("user_id", userId)
    .gte("date", since);

  if (error) return [];

  const byAgent = new Map<string, { runs: number; cost_usd: number }>();
  for (const row of data ?? []) {
    const prev = byAgent.get(row.agent_name) ?? { runs: 0, cost_usd: 0 };
    byAgent.set(row.agent_name, {
      runs: prev.runs + row.runs,
      cost_usd: prev.cost_usd + Number(row.cost_usd),
    });
  }

  return Array.from(byAgent.entries()).map(([agent_name, v]) => ({
    agent_name,
    runs: v.runs,
    cost_usd: v.cost_usd,
  }));
}
