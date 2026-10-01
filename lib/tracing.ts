// lib/tracing.ts
// Trace ID generation + span recording.
// Uses an in-process ring buffer as the sink. Swap for OTLP exporter later
// by replacing recordSpan().

export function createTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createSpanId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  serviceId?: string;
  provider?: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: "ok" | "error";
  attributes: Record<string, unknown>;
}

const MAX_SPANS = 2000;
const ring: SpanData[] = [];

export function recordSpan(span: SpanData): void {
  if (span.endedAt && !span.durationMs) {
    span.durationMs = span.endedAt - span.startedAt;
  }
  ring.push(span);
  if (ring.length > MAX_SPANS) {
    ring.splice(0, ring.length - MAX_SPANS);
  }
}

export function getRecentSpans(limit = 100): SpanData[] {
  return ring.slice(-limit);
}

export function getSpansByTrace(traceId: string): SpanData[] {
  return ring.filter((s) => s.traceId === traceId);
}

export interface SpanOptions {
  traceId?: string;
  parentSpanId?: string;
  serviceId?: string;
  provider?: string;
  attributes?: Record<string, unknown>;
}

export async function withSpan<T>(
  name: string,
  fn: (span: SpanData) => Promise<T>,
  options: SpanOptions = {}
): Promise<T> {
  const span: SpanData = {
    traceId: options.traceId ?? createTraceId(),
    spanId: createSpanId(),
    parentSpanId: options.parentSpanId,
    name,
    serviceId: options.serviceId,
    provider: options.provider,
    startedAt: Date.now(),
    status: "ok",
    attributes: { ...(options.attributes ?? {}) },
  };
  try {
    const result = await fn(span);
    span.status = "ok";
    return result;
  } catch (e) {
    span.status = "error";
    span.attributes.error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    span.endedAt = Date.now();
    recordSpan(span);
  }
}
