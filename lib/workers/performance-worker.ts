// lib/workers/performance-worker.ts
import { callMCP } from "@/lib/mcp/client";
import { toWorkerError } from "./errors";
import { withRetry } from "./retry";
import { logWorkerRun } from "./logger";
import type {
  CampaignMetrics,
  PerformanceAudit,
  WorkerOutput,
  WorkerStepResult,
} from "@/lib/types";

export interface PerformanceWorkerInput {
  userId: string;
  runId: string;
  platforms: string[];
  dateRange?: string;
  logToDatabase?: boolean;
}

export async function runPerformanceWorker(
  input: PerformanceWorkerInput
): Promise<WorkerOutput<PerformanceAudit>> {
  const start = Date.now();
  const steps: WorkerStepResult[] = [];

  try {
    const result = await withRetry(
      () => callMCP<PerformanceAudit>("markifact", "analyze_performance", {
        userId: input.userId,
        platforms: input.platforms,
        date_range: input.dateRange ?? "last_30_days",
      }),
      { maxAttempts: 3, baseDelayMs: 500 }
    );

    const step: WorkerStepResult = {
      stepId: "analyze",
      tool: "markifact.analyze_performance",
      ok: result.ok,
      output: result.data,
      durationMs: Date.now() - start,
      error: result.ok
        ? undefined
        : { code: "MCP_CALL_FAILED", message: result.error ?? "unknown", retryable: true },
    };
    steps.push(step);

    if (!result.ok || !result.data) {
      const output: WorkerOutput<PerformanceAudit> = {
        status: "failed", ok: false, error: step.error,
        worker: "performance-worker", userId: input.userId, runId: input.runId,
        plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
      };
      if (input.logToDatabase !== false) await logWorkerRun(output);
      return output;
    }

    const enriched = enrichAudit(result.data);

    const output: WorkerOutput<PerformanceAudit> = {
      status: "ok", ok: true, result: enriched,
      worker: "performance-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  } catch (e) {
    const error = toWorkerError(e);
    const output: WorkerOutput<PerformanceAudit> = {
      status: "failed", ok: false, error,
      worker: "performance-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  }
}

function enrichAudit(audit: PerformanceAudit): PerformanceAudit {
  const metrics: CampaignMetrics[] = audit.metrics.map((m) => ({
    ...m,
    ctr: m.ctr ?? (m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0),
    cpc: m.cpc ?? (m.clicks > 0 ? m.spend / m.clicks : 0),
  }));

  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const avgRoas =
    metrics.length > 0 ? metrics.reduce((s, m) => s + m.roas, 0) / metrics.length : 0;

  return {
    metrics,
    recommendations: audit.recommendations ?? [],
    synced_at: audit.synced_at ?? new Date().toISOString(),
    total_spend: audit.total_spend ?? totalSpend,
    total_conversions: audit.total_conversions ?? totalConversions,
    avg_roas: audit.avg_roas ?? avgRoas,
  };
}
