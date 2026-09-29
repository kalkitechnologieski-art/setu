// lib/observability.ts
// ═══════════════════════════════════════════════════════════════════════════
// Lightweight error tracking.
//
// In dev: logs to console with structured fields.
// In prod: POSTs to /api/observability/ingest which writes to governance_events.
//
// No vendor SDK — the ingest endpoint is 40 lines and uses the DB we already
// have. Swap for Sentry/Axiom later by changing `reportError` only.
// ═══════════════════════════════════════════════════════════════════════════

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

  if (isDev) {
    console.error("[observability]", payload);
    return;
  }

  // Fire-and-forget; never block the UI on observability
  if (typeof window !== "undefined") {
    try {
      void fetch("/api/observability/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* swallow — never let observability fail the app */
      });
    } catch {
      /* swallow */
    }
  } else {
    console.error("[observability]", payload);
  }
}
