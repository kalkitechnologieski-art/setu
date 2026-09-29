// lib/types/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// Shared type surface for the entire lib/ layer.
// All re-exports use `export type` for isolatedModules compatibility.
// ═══════════════════════════════════════════════════════════════════════════
import type { Json } from "@/lib/supabase/types";

// ─── Supabase re-exports ──────────────────────────────────────────────────
export type {
  Database,
  Json,

  // Core rows
  Profile, Lead, Campaign, Email, Call, AdPerformance,
  AgentRun, Job, RateLimit, Approval, Signal, AgentCost,
  PlatformConnection, AuthEvent, AgentRegistry, ApprovalChain,
  AgentMetric, GovernanceEvent, ContentPost, KnowledgeBase,
  DocumentRow, DocumentSection, NotificationRow,

  // Phase 2 rows
  MediaAsset, PostMedia, Conversation, ConversationMessage,
  EmailDomain, EmailBounce, Touchpoint, Attribution,
  ABTest, ABTestResult, Organization, OrganizationMember,
  AgentTelemetry, EvaluationResult, PolicyViolation,
  WhatsAppAccount, WhatsAppTemplate, WhatsAppConsent, WhatsAppMessage,
  ActionPolicy, AgentSchedule, AgentRunStep,
  ApprovalBatch, ApprovalBatchItem, WebhookEvent,

  // Insert aliases
  ProfileInsert, LeadInsert, CampaignInsert, EmailInsert, CallInsert,
  AdPerformanceInsert, AgentRunInsert, JobInsert, RateLimitInsert,
  ApprovalInsert, SignalInsert, AgentCostInsert, PlatformConnectionInsert,
  AuthEventInsert, AgentRegistryInsert, ApprovalChainInsert, AgentMetricInsert,
  GovernanceEventInsert, ContentPostInsert, KnowledgeBaseInsert, DocumentInsert,
  DocumentSectionInsert, NotificationInsert, MediaAssetInsert,
  ConversationInsert, ConversationMessageInsert, EmailDomainInsert,
  EmailBounceInsert, TouchpointInsert, AttributionInsert, ABTestInsert,
  OrganizationInsert, OrganizationMemberInsert, AgentTelemetryInsert,
  EvaluationResultInsert, PolicyViolationInsert, WhatsAppMessageInsert,
  AgentScheduleInsert, AgentRunStepInsert,

  // Update aliases
  ProfileUpdate, LeadUpdate, CampaignUpdate, EmailUpdate, CallUpdate,
  AgentRunUpdate, JobUpdate, ApprovalUpdate, SignalUpdate,
  ContentPostUpdate, KnowledgeBaseUpdate, DocumentUpdate,
  MediaAssetUpdate, ConversationUpdate, EmailDomainUpdate,
  ABTestUpdate, OrganizationUpdate, AgentScheduleUpdate,
  NotificationUpdate,

  // Literal unions
  LeadStatus, CampaignStatus, CampaignType, ContentStatus,
  DocumentStatus, KnowledgeScope, PlatformSlug,
  EmailStatus, CallDirection, CallSentiment, AgentRunStatus,
  JobStatus, Plan, ApprovalStatus, SignalUrgency, NotificationKind,
  ConversationStatus, ConversationPriority, ConversationChannel,
  ConversationSentiment, MessageDirection, MessageSenderType,
  MediaType, PostType, BounceType, ABTestType, ABTestStatus,
  OrgRole, OrgPlan, PolicyTier, TelemetryEventType, EvaluationScope,
  WhatsAppCategory, WhatsAppTemplateStatus,

  // RPC arg/return helpers
  ClaimJobArgs, ClaimJobReturn,
  CheckRateLimitArgs, CheckRateLimitReturn,
  StorePlatformSecretArgs, StorePlatformSecretReturn,
  ReadPlatformSecretArgs, ReadPlatformSecretReturn,
  SeedDefaultAgentsArgs,
  MatchDocumentSectionsArgs, MatchDocumentSectionsReturn,
  RefreshUserOrgClaimsArgs, AuthOrgIdsReturn,
} from "@/lib/supabase/types";

// ─── LLM ─────────────────────────────────────────────────────────────────
export type { LLMMessage, LLMResult, RouterOptions } from "@/lib/llm/router";
export type { ProviderName } from "@/lib/llm/providers";

// ─── MCP ─────────────────────────────────────────────────────────────────
export type {
  MCPToolDefinition, MCPService, MCPCallResult, MCPToolKind,
} from "@/lib/mcp/types";

// ─── Domain types ────────────────────────────────────────────────────────

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

// ─── Worker contract ─────────────────────────────────────────────────────

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

// ─── JSON serialization ──────────────────────────────────────────────────

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
  if (t === "string" || t === "number" || t === "boolean") {
    return value as Json;
  }

  if (Array.isArray(value)) {
    return value.map((v) => toJson(v));
  }

  if (t === "object") {
    const out: { [k: string]: Json } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJson(v);
    }
    return out;
  }

  return null;
}
