// lib/workers/lead-worker.ts
import { callMCP } from "@/lib/mcp/client";
import { toWorkerError } from "./errors";
import { withRetry } from "./retry";
import { logWorkerRun } from "./logger";
import type { WorkerOutput, WorkerStepResult } from "@/lib/types";

export interface LeadWorkerInput {
  userId: string;
  query: string;
  runId: string;
  limit?: number;
  logToDatabase?: boolean;
}

export async function runLeadWorker(input: LeadWorkerInput): Promise<WorkerOutput> {
  const start = Date.now();
  const steps: WorkerStepResult[] = [];

  try {
    const result = await withRetry(
      () => callMCP("munin", "search_contacts", {
        userId: input.userId,
        query: input.query,
        limit: input.limit ?? 25,
      }),
      { maxAttempts: 3, baseDelayMs: 400 }
    );

    const step: WorkerStepResult = {
      stepId: "search",
      tool: "munin.search_contacts",
      ok: result.ok,
      output: result.data,
      durationMs: Date.now() - start,
      error: result.ok
        ? undefined
        : { code: "MCP_CALL_FAILED", message: result.error ?? "unknown", retryable: true },
    };
    steps.push(step);

    if (!result.ok) {
      const output: WorkerOutput = {
        status: "failed", ok: false, error: step.error,
        worker: "lead-worker", userId: input.userId, runId: input.runId,
        plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
      };
      if (input.logToDatabase !== false) await logWorkerRun(output);
      return output;
    }

    const output: WorkerOutput = {
      status: "ok", ok: true, result: result.data,
      worker: "lead-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  } catch (e) {
    const error = toWorkerError(e);
    const output: WorkerOutput = {
      status: "failed", ok: false, error,
      worker: "lead-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  }
}
