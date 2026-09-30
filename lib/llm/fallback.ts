// lib/llm/fallback.ts
// Graceful fallback responses when all LLM providers are unreachable.
// Client NEVER sees a raw error — only these curated messages.

const FALLBACK_MESSAGES = [
  "My neural-link is temporarily offline. Give me a moment and try again.",
  "Connection to my reasoning engine is unstable. Please retry your request.",
  "I'm experiencing elevated latency reaching my AI services. Try again shortly.",
  "My backend is catching its breath. Please send your message again.",
] as const;

let lastFallbackIndex = -1;

/** Pick a fallback message, avoiding repetition across consecutive calls. */
export function pickFallbackMessage(): string {
  let idx = Math.floor(Math.random() * FALLBACK_MESSAGES.length);
  if (idx === lastFallbackIndex) {
    idx = (idx + 1) % FALLBACK_MESSAGES.length;
  }
  lastFallbackIndex = idx;
  return FALLBACK_MESSAGES[idx] ?? FALLBACK_MESSAGES[0];
}

/** Classify an LLM provider error into a stable reason code. */
export type FailureReason =
  | "missing_key"
  | "malformed_key"
  | "auth_rejected"
  | "rate_limited"
  | "timeout"
  | "network_error"
  | "provider_error"
  | "all_failed";

export function classifyFailure(error: unknown, provider: string): FailureReason {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("missing_") || lower.includes("not configured")) {
    return "missing_key";
  }
  if (lower.includes("malformed") || lower.includes("invalid format")) {
    return "malformed_key";
  }
  if (lower.includes("401") || lower.includes("invalid_api_key")) {
    return "auth_rejected";
  }
  if (lower.includes("429") || lower.includes("rate")) {
    return "rate_limited";
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return "timeout";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "network_error";
  }
  if (lower.includes(`${provider}_`)) {
    return "provider_error";
  }
  return "provider_error";
}

/** Human-readable reason — for internal logs only, never for clients. */
export const REASON_LABELS: Record<FailureReason, string> = {
  missing_key: "API key not set",
  malformed_key: "API key malformed",
  auth_rejected: "Provider rejected credentials",
  rate_limited: "Provider rate limit hit",
  timeout: "Provider timed out",
  network_error: "Network unreachable",
  provider_error: "Provider returned an error",
  all_failed: "All providers exhausted",
};
