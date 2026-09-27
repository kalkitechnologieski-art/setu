// lib/workers/supervisor.ts
// ═══════════════════════════════════════════════════════════════════════════
// Siddhi supervisor — LangGraph-style state machine.
//
// Flow: PLAN → EXECUTE → (APPROVAL?) → SUMMARISE → DONE
//
// LINT CLEAN: WorkerStepResult is not imported — objects pushed onto
// state.steps are structurally compatible without an explicit annotation.
// ═══════════════════════════════════════════════════════════════════════════
import { randomUUID } from "node:crypto";
import { routeLLM } from "@/lib/llm/router";
import { MCP_TOOLS, findTool } from "@/lib/mcp/registry";
import { callMCP, isServiceConfigured } from "@/lib/mcp/client";
import {
  DEFAULT_WORKER_OPTIONS,
  type WorkerInput,
  type WorkerOutput,
  type WorkerPlanStep,
} from "@/lib/types";
import { toWorkerError } from "./errors";
import { withRetry, withTimeout } from "./retry";
import { logWorkerRun } from "./logger";
import {
  initialState,
  nextStep,
  advance,
  isPastDeadline,
  type WorkerState,
} from "./state";

const SUPERVISOR_NAME = "siddhi-supervisor";

export async function runSupervisor(input: WorkerInput): Promise<WorkerOutput> {
  const runId = input.runId ?? randomUUID();
  const options = DEFAULT_WORKER_OPTIONS;
  const state = initialState(
    runId,
    input.userId,
    input.task,
    input.context ?? {},
    input.timeoutMs ?? options.totalTimeoutMs
  );

  try {
    state.phase = "planning";
    state.plan = await planTask(state, input);
  } catch (e) {
    return finalise(state, "failed", toWorkerError(e));
  }

  state.phase = "executing";
  while (nextStep(state)) {
    if (isPastDeadline(state)) {
      return finalise(state, "failed", {
        code: "TIMEOUT",
        message: "Supervisor exceeded total deadline",
        retryable: false,
      });
    }

    const step = nextStep(state)!;

    if (!step.tool) {
      try {
        const res = await withTimeout(
          () => routeLLM({
            messages: [
              { role: "system", content: "You are Siddhi, a marketing operations agent." },
              { role: "user", content: `${state.task}\n\nContext: ${JSON.stringify(state.context)}` },
            ],
            preferredProvider: input.preferredProvider,
          }),
          options.stepTimeoutMs,
          `llm-step:${step.id}`
        );
        state.steps.push({
          stepId: step.id,
          tool: "llm",
          ok: true,
          output: res.text,
          provider: res.provider,
          durationMs: res.duration_ms,
        });
      } catch (e) {
        state.steps.push({
          stepId: step.id,
          tool: "llm",
          ok: false,
          output: null,
          durationMs: 0,
          error: toWorkerError(e),
        });
      }
      advance(state);
      continue;
    }

    const tool = findTool(step.tool);
    if (!tool) {
      state.steps.push({
        stepId: step.id,
        tool: step.tool,
        ok: false,
        output: null,
        durationMs: 0,
        error: {
          code: "VALIDATION_FAILED",
          message: `Unknown tool: ${step.tool}`,
          retryable: false,
        },
      });
      advance(state);
      continue;
    }

    if (!isServiceConfigured(tool.service)) {
      state.steps.push({
        stepId: step.id,
        tool: step.tool,
        ok: false,
        output: null,
        durationMs: 0,
        error: {
          code: "CONFIG_MISSING",
          message: `Service ${tool.service} not configured`,
          retryable: false,
        },
      });
      advance(state);
      continue;
    }

    if (tool.requiresApproval) {
      state.phase = "awaiting_approval";
      const now = Date.now();
      state.approval = {
        token: `appr-${now}-${randomUUID().slice(0, 8)}`,
        tool: step.tool,
        service: tool.service,
        args: state.context,
        requestedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 15 * 60_000).toISOString(),
      };
      state.steps.push({
        stepId: step.id,
        tool: step.tool,
        ok: false,
        output: "Pending approval",
        durationMs: 0,
      });
      return finalise(state, "pending_approval", undefined);
    }

    const toolStart = Date.now();
    try {
      const res = await withTimeout(
        () => withRetry(
          () => callMCP(tool.service, step.tool!.split(".")[1]!, state.context),
          { maxAttempts: 2, baseDelayMs: 500 }
        ),
        options.stepTimeoutMs,
        `mcp-step:${step.tool}`
      );
      state.steps.push({
        stepId: step.id,
        tool: step.tool,
        ok: res.ok,
        output: res.ok ? res.data : res.error,
        durationMs: Date.now() - toolStart,
        error: res.ok
          ? undefined
          : {
              code: "MCP_CALL_FAILED",
              message: res.error ?? "unknown",
              retryable: true,
            },
      });
    } catch (e) {
      state.steps.push({
        stepId: step.id,
        tool: step.tool,
        ok: false,
        output: null,
        durationMs: Date.now() - toolStart,
        error: toWorkerError(e),
      });
    }
    advance(state);
  }

  state.phase = "summarising";
  try {
    const summary = await withTimeout(
      () => routeLLM({
        messages: [
          {
            role: "system",
            content: "Summarise the agent run for the user in 2-3 sentences. Be concise and business-focused.",
          },
          {
            role: "user",
            content: `Task: ${state.task}\nResults: ${JSON.stringify(state.steps)}`,
          },
        ],
        maxTokens: 400,
        preferredProvider: input.preferredProvider,
      }),
      options.stepTimeoutMs,
      "summary"
    );
    state.summary = summary.text;
  } catch {
    state.summary = "Task completed.";
  }

  return finalise(state, "ok", undefined);
}

async function planTask(
  state: WorkerState,
  input: WorkerInput
): Promise<WorkerPlanStep[]> {
  const maxSteps = input.maxSteps ?? 5;
  const availableTools = MCP_TOOLS.filter((t) => isServiceConfigured(t.service))
    .map((t) => `${t.name} [${t.kind}${t.requiresApproval ? ", approval" : ""}] — ${t.description}`)
    .join("\n");

  const planPrompt = `You are Siddhi, a marketing operations planner.

Available tools:
${availableTools || "(none configured — LLM reasoning only)"}

Task: ${input.task}
Context: ${JSON.stringify(state.context)}

Return ONLY a JSON array of 1-${maxSteps} plan steps:
[{"description": "...", "tool": "tool.name" | null, "reasoning": "..."}]

Rules:
- Use only tools from the list above.
- Set tool to null if the step needs pure reasoning.
- Never invent tool names.
- Max ${maxSteps} steps.`;

  const result = await routeLLM({
    messages: [
      { role: "system", content: "You output only valid JSON arrays." },
      { role: "user", content: planPrompt },
    ],
    temperature: 0.2,
    maxTokens: 800,
    preferredProvider: input.preferredProvider,
  });

  const parsed = safeJsonParse(result.text);
  if (!Array.isArray(parsed)) {
    return [
      {
        id: randomUUID(),
        description: "Direct LLM response",
        tool: null,
        service: null,
        requiresApproval: false,
        estimatedTokens: 0,
      },
    ];
  }

  return parsed.slice(0, maxSteps).map((p: Record<string, unknown>, i: number) => {
    const toolName = typeof p.tool === "string" ? p.tool : null;
    const tool = toolName ? findTool(toolName) : undefined;
    return {
      id: randomUUID(),
      description:
        typeof p.description === "string" ? p.description : `Step ${i + 1}`,
      tool: tool ? toolName : null,
      service: tool?.service ?? null,
      requiresApproval: tool?.requiresApproval ?? false,
      estimatedTokens: 0,
    };
  });
}

function safeJsonParse(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function finalise(
  state: WorkerState,
  status: WorkerOutput["status"],
  error: WorkerOutput["error"] | undefined
): Promise<WorkerOutput> {
  state.phase =
    status === "ok"
      ? "done"
      : status === "pending_approval"
        ? "awaiting_approval"
        : "failed";

  const output: WorkerOutput = {
    status,
    ok: status === "ok",
    error,
    approval: state.approval,
    summary: state.summary,
    worker: SUPERVISOR_NAME,
    userId: state.userId,
    runId: state.runId,
    plan: state.plan,
    steps: state.steps,
    tokensUsed: state.tokensUsed,
    durationMs: Date.now() - state.startedAt,
  };

  await logWorkerRun(output);
  return output;
}
