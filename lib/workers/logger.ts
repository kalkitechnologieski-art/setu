// lib/workers/logger.ts
// ═══════════════════════════════════════════════════════════════════════════
// Persists every worker run to the agent_runs table.
//
// The agent_runs.input and agent_runs.output columns are `jsonb` in Postgres
// and typed as the recursive `Json` union in TypeScript. Worker outputs
// contain arbitrary nested objects, which TypeScript cannot assign to `Json`
// directly. toJson() recursively walks the value and produces a Json-safe
// copy — type-checked at compile time and validated at runtime.
//
// Uses the admin (service role) client — never import from a Client Component.
// Silently degrades if Supabase keys are not yet configured.
// ═══════════════════════════════════════════════════════════════════════════
import { createAdminClient } from "@/lib/supabase/admin";
import { toJson } from "@/lib/types";
import type { AgentRunInsert, WorkerOutput } from "@/lib/types";

// ─── Status mapping ───────────────────────────────────────────────────────

function mapStatus(
  s: WorkerOutput["status"]
): "running" | "completed" | "failed" | "pending_approval" {
  switch (s) {
    case "ok":
      return "completed";
    case "pending_approval":
      return "pending_approval";
    case "failed":
      return "failed";
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function logWorkerRun(output: WorkerOutput): Promise<void> {
  // Graceful degradation before keys are configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "__SET_ME__") return;

  // Build a fully-typed insert payload.
  // toJson() handles the recursive Json coercion for input/output.
  const payload: AgentRunInsert = {
    id: output.runId,
    user_id: output.userId,
    agent_name: output.worker,
    status: mapStatus(output.status),
    input: toJson({
      task: output.summary ?? "",
      plan: output.plan,
    }),
    output: toJson({
      steps: output.steps,
      approval: output.approval ?? null,
      error: output.error ?? null,
    }),
    tokens_used: output.tokensUsed,
    duration_ms: output.durationMs,
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("agent_runs").insert(payload);
    if (error) {
      console.warn("[worker-logger] insert failed:", error.message);
    }
  } catch (e) {
    console.warn("[worker-logger] unexpected error:", e);
  }
}
