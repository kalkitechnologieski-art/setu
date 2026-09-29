// lib/observability.ts
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
      }).catch(() => { /* swallow — never let observability fail the app */ });
    } catch { /* swallow */ }
  } else {
    console.error("[observability]", payload);
  }
}
