// lib/workers/campaign-worker.ts
import { callMCP } from "@/lib/mcp/client";
import { toWorkerError } from "./errors";
import { withRetry } from "./retry";
import { logWorkerRun } from "./logger";
import type { WorkerApproval, WorkerOutput, WorkerStepResult } from "@/lib/types";

export type CampaignAction = "create" | "pause" | "resume" | "optimize_budget";

export interface CampaignWorkerInput {
  userId: string;
  runId: string;
  action: CampaignAction;
  campaignId?: string;
  payload?: Record<string, unknown>;
  autoApprove?: boolean;
  logToDatabase?: boolean;
}

const ACTION_TOOL: Record<CampaignAction, string> = {
  create: "create_campaign",
  pause: "pause_campaign",
  resume: "resume_campaign",
  optimize_budget: "optimize_budget",
};

export async function runCampaignWorker(input: CampaignWorkerInput): Promise<WorkerOutput> {
  const start = Date.now();
  const steps: WorkerStepResult[] = [];
  const tool = ACTION_TOOL[input.action];
  const fullTool = `markifact.${tool}`;

  try {
    const result = await withRetry(
      () => callMCP("markifact", tool, {
        userId: input.userId,
        campaign_id: input.campaignId,
        ...input.payload,
      }),
      { maxAttempts: 2, baseDelayMs: 600 }
    );

    const step: WorkerStepResult = {
      stepId: input.action,
      tool: fullTool,
      ok: result.ok,
      output: result.data,
      durationMs: Date.now() - start,
      error: result.ok
        ? undefined
        : { code: "MCP_CALL_FAILED", message: result.error ?? "unknown", retryable: true },
    };
    steps.push(step);

    if (result.requiresApproval && !input.autoApprove) {
      const now = Date.now();
      const approval: WorkerApproval = {
        token: result.approvalToken ?? `appr-${now}-${Math.random().toString(36).slice(2, 8)}`,
        tool: fullTool,
        service: "markifact",
        args: { campaign_id: input.campaignId, ...input.payload },
        requestedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 15 * 60_000).toISOString(),
      };

      const output: WorkerOutput = {
        status: "pending_approval", ok: false, approval, result: result.data,
        worker: "campaign-worker", userId: input.userId, runId: input.runId,
        plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
      };
      if (input.logToDatabase !== false) await logWorkerRun(output);
      return output;
    }

    if (!result.ok) {
      const output: WorkerOutput = {
        status: "failed", ok: false, error: step.error,
        worker: "campaign-worker", userId: input.userId, runId: input.runId,
        plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
      };
      if (input.logToDatabase !== false) await logWorkerRun(output);
      return output;
    }

    const output: WorkerOutput = {
      status: "ok", ok: true, result: result.data,
      worker: "campaign-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  } catch (e) {
    const error = toWorkerError(e);
    const output: WorkerOutput = {
      status: "failed", ok: false, error,
      worker: "campaign-worker", userId: input.userId, runId: input.runId,
      plan: [], steps, tokensUsed: 0, durationMs: Date.now() - start,
    };
    if (input.logToDatabase !== false) await logWorkerRun(output);
    return output;
  }
}
