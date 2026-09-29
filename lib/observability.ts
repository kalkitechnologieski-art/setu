// lib/observability.ts
// Error reporting + OpenTelemetry GenAI span recording.
export interface ErrorContext {
  scope: string;
  userId?: string;
  route?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

interface ErrorPayload {
  message: string;
  stack?: string;
  context: ErrorContext;
  at: string;
  url?: string;
  userAgent?: string;
}

const isDev = process.env.NODE_ENV !== "production";

export function reportError(error: unknown, context: ErrorContext): void {
  const payload: ErrorPayload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    at: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  if (isDev) { console.error("[observability]", payload); return; }

  if (typeof window !== "undefined") {
    try {
      void fetch("/api/observability/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* swallow */ });
    } catch { /* swallow */ }
  } else {
    console.error("[observability]", payload);
  }
}

// ─── GenAI span recording ────────────────────────────────────────────────
export type GenAIOperation = "chat" | "embeddings" | "tool" | "invoke_agent";

export interface GenAISpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: GenAIOperation;
  system: "groq" | "gemini" | "openrouter" | "internal";
  requestModel?: string;
  responseModel?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status: "ok" | "error";
  errorMessage?: string;
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

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { toJson } = await import("@/lib/types");
    const admin = createAdminClient();

    await admin.from("agent_telemetry").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      run_id: null,
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId ?? null,
      agent_slug: span.system,
      step_index: null,
      event_type: span.operation === "tool" ? "tool_call" : "llm_call",
      gen_ai_system: span.system,
      gen_ai_operation: span.operation,
      gen_ai_request_model: span.requestModel ?? null,
      gen_ai_response_model: span.responseModel ?? null,
      gen_ai_input_tokens: span.inputTokens ?? 0,
      gen_ai_output_tokens: span.outputTokens ?? 0,
      duration_ms: span.durationMs ?? 0,
      span_status: span.status,
      exception_message: span.errorMessage ?? null,
      attributes: toJson(span.attributes ?? {}),
    });
  } catch { /* never block */ }
}

export async function withSpan<T>(
  span: Omit<GenAISpan, "spanId" | "durationMs" | "status">,
  fn: () => Promise<T>
): Promise<T> {
  const spanId = createSpanId();
  const start = Date.now();
  try {
    const result = await fn();
    void recordSpan({ ...span, spanId, durationMs: Date.now() - start, status: "ok" });
    return result;
  } catch (e) {
    void recordSpan({
      ...span, spanId,
      durationMs: Date.now() - start,
      status: "error",
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
