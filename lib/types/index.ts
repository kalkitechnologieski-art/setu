// lib/types/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// Shared type surface for the entire lib/ layer.
// ═══════════════════════════════════════════════════════════════════════════
//
// NOTE: `Json` is imported at file scope (not just re-exported) so that the
// local toJson() and Jsonify<T> helpers below can reference it. A bare
// `export type { Json } from "..."` re-exports without populating the
// module's local namespace, which would make `Json` unresolvable here.
//
// IMPORTANT: only re-export names that actually exist in
// lib/supabase/types.ts — otherwise TS2305 fires at the re-export site.

import type { Json } from "@/lib/supabase/types";

// ─── Supabase — re-exports (must match lib/supabase/types.ts exactly) ─────
export type {
  Database,
  Json,
  Profile,  Lead,  Campaign,  Email,  Call,
  AdPerformance,  AgentRun,  Job,  RateLimit,
  Approval,  Signal,  AgentCost,

  ProfileInsert,  ProfileUpdate,
  LeadInsert,     LeadUpdate,
  CampaignInsert, CampaignUpdate,
  EmailInsert,    CallInsert,
  AgentRunInsert, JobInsert,
  ApprovalInsert, ApprovalUpdate,
  SignalInsert,   SignalUpdate,
  AgentCostInsert,

  LeadStatus, CampaignStatus, CampaignType, EmailStatus,
  CallDirection, CallSentiment, AgentRunStatus, JobStatus,
  Plan, ApprovalStatus, SignalUrgency,

  ClaimJobArgs, ClaimJobReturn,
  CheckRateLimitArgs, CheckRateLimitReturn,
} from "@/lib/supabase/types";

// ─── LLM ───────────────────────────────────────────────────────────────────
export type { LLMMessage, LLMResult, RouterOptions } from "@/lib/llm/router";
export type { ProviderName } from "@/lib/llm/providers";

// ─── MCP ───────────────────────────────────────────────────────────────────
export type {
  MCPToolDefinition, MCPService, MCPCallResult, MCPToolKind,
} from "@/lib/mcp/types";

// ─── Marketing domain ─────────────────────────────────────────────────────

export interface BudgetRecommendation {
  campaign_id: string;
  platform: string;
  current_budget: number;
  recommended_budget: number;
  reason: string;
  confidence: number;
}

export interface CampaignMetrics {
  platform: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  ctr: number;
  cpc: number;
}

export interface PerformanceAudit {
  metrics: CampaignMetrics[];
  recommendations: BudgetRecommendation[];
  synced_at: string;
  total_spend: number;
  total_conversions: number;
  avg_roas: number;
}

// ─── Worker contract (discriminated union) ────────────────────────────────

export type WorkerStatus = "ok" | "pending_approval" | "failed";

export type WorkerErrorCode =
  | "CONFIG_MISSING" | "PROVIDER_UNAVAILABLE" | "PROVIDER_RATE_LIMITED"
  | "MCP_CALL_FAILED" | "VALIDATION_FAILED" | "TIMEOUT"
  | "APPROVAL_REJECTED" | "UNKNOWN";

export interface WorkerError {
  code: WorkerErrorCode;
  message: string;
  provider?: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface WorkerApproval {
  token: string;
  tool: string;
  service: string;
  args: Record<string, unknown>;
  requestedAt: string;
  expiresAt: string;
}

export interface WorkerPlanStep {
  id: string;
  description: string;
  tool: string | null;
  service: string | null;
  requiresApproval: boolean;
  estimatedTokens: number;
}

export interface WorkerStepResult {
  stepId: string;
  tool: string;
  ok: boolean;
  output: unknown;
  provider?: string;
  tokensUsed?: number;
  durationMs: number;
  error?: WorkerError;
}

export interface WorkerOutput<T = unknown> {
  status: WorkerStatus;
  ok: boolean;
  result?: T;
  error?: WorkerError;
  approval?: WorkerApproval;
  worker: string;
  userId: string;
  runId: string;
  plan: WorkerPlanStep[];
  steps: WorkerStepResult[];
  summary?: string;
  tokensUsed: number;
  durationMs: number;
}

export interface WorkerInput {
  userId: string;
  task: string;
  context?: Record<string, unknown>;
  runId?: string;
  maxSteps?: number;
  timeoutMs?: number;
  preferredProvider?: "groq" | "gemini" | "openrouter";
}

export interface WorkerRuntimeOptions {
  maxRetries: number;
  backoffBaseMs: number;
  stepTimeoutMs: number;
  totalTimeoutMs: number;
  logToDatabase: boolean;
}

export const DEFAULT_WORKER_OPTIONS: WorkerRuntimeOptions = {
  maxRetries: 3,
  backoffBaseMs: 500,
  stepTimeoutMs: 30_000,
  totalTimeoutMs: 120_000,
  logToDatabase: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON serialization helpers
// ═══════════════════════════════════════════════════════════════════════════

export type Jsonify<T> = T extends string | number | boolean | null
  ? T
  : T extends undefined
    ? null
    : T extends readonly (infer U)[]
      ? Jsonify<U>[]
      : T extends object
        ? { [K in keyof T]: Jsonify<T[K]> }
        : null;

export function toJson<T>(value: T): Json {
  if (value === null || value === undefined) return null;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value as Json;
  if (Array.isArray(value)) return value.map((v) => toJson(v));
  if (t === "object") {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJson(v);
    }
    return out;
  }
  return null;
}
