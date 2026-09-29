// lib/observability/genai-spans.ts
// OpenTelemetry GenAI semantic conventions for agent runs.

import { createAdminClient } from "@/lib/supabase/admin";
import { toJson } from "@/lib/types";

export type EventType =
  | "plan" | "llm_call" | "tool_call" | "tool_result" | "approval" | "error" | "summary";

export interface GenAISpan {
  userId: string;
  runId?: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  agentSlug: string;
  stepIndex?: number;
  eventType: EventType;
  genAiSystem?: "groq" | "gemini" | "openrouter" | "modal";
  genAiOperation?: "chat" | "embeddings" | "tool";
  genAiRequestModel?: string;
  genAiResponseModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  spanStatus?: "ok" | "error";
  exceptionMessage?: string;
  attributes?: Record<string, unknown>;
}

export function createTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function createSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function recordSpan(span: GenAISpan): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || key === "__SET_ME__") return;

    const supabase = createAdminClient();
    await supabase.from("agent_telemetry").insert({
      user_id: span.userId,
      run_id: span.runId ?? null,
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId ?? null,
      agent_slug: span.agentSlug,
      step_index: span.stepIndex ?? null,
      event_type: span.eventType,
      gen_ai_system: span.genAiSystem ?? null,
      gen_ai_operation: span.genAiOperation ?? null,
      gen_ai_request_model: span.genAiRequestModel ?? null,
      gen_ai_response_model: span.genAiResponseModel ?? null,
      gen_ai_input_tokens: span.inputTokens ?? 0,
      gen_ai_output_tokens: span.outputTokens ?? 0,
      duration_ms: span.durationMs ?? 0,
      span_status: span.spanStatus ?? "ok",
      exception_message: span.exceptionMessage ?? null,
      attributes: toJson(span.attributes ?? {}),
    });
  } catch {
    /* observability never blocks */
  }
}

export async function withSpan<T>(
  span: Omit<GenAISpan, "spanId" | "durationMs" | "spanStatus">,
  fn: () => Promise<T>
): Promise<T> {
  const spanId = createSpanId();
  const start = Date.now();
  try {
    const result = await fn();
    void recordSpan({ ...span, spanId, durationMs: Date.now() - start, spanStatus: "ok" });
    return result;
  } catch (e) {
    void recordSpan({
      ...span,
      spanId,
      durationMs: Date.now() - start,
      spanStatus: "error",
      exceptionMessage: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
