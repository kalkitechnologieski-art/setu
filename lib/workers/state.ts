// lib/workers/state.ts
import type { WorkerApproval, WorkerPlanStep, WorkerStepResult } from "@/lib/types";

export type SupervisorPhase =
  | "idle"
  | "planning"
  | "executing"
  | "summarising"
  | "awaiting_approval"
  | "done"
  | "failed";

export interface WorkerState {
  runId: string;
  userId: string;
  task: string;
  context: Record<string, unknown>;
  phase: SupervisorPhase;
  plan: WorkerPlanStep[];
  currentStepIndex: number;
  steps: WorkerStepResult[];
  approval?: WorkerApproval;
  summary?: string;
  error?: string;
  tokensUsed: number;
  startedAt: number;
  deadlineAt: number;
}

export function initialState(
  runId: string,
  userId: string,
  task: string,
  context: Record<string, unknown> = {},
  timeoutMs = 120_000
): WorkerState {
  const now = Date.now();
  return {
    runId,
    userId,
    task,
    context,
    phase: "idle",
    plan: [],
    currentStepIndex: 0,
    steps: [],
    tokensUsed: 0,
    startedAt: now,
    deadlineAt: now + timeoutMs,
  };
}

export function nextStep(state: WorkerState): WorkerPlanStep | undefined {
  return state.plan[state.currentStepIndex];
}

export function advance(state: WorkerState): void {
  state.currentStepIndex += 1;
}

export function isPastDeadline(state: WorkerState): boolean {
  return Date.now() > state.deadlineAt;
}
