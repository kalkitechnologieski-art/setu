// lib/llm/router.ts
// Multi-provider LLM router with strict key validation, circuit breaker,
// and graceful fallback. NEVER throws raw provider errors to callers.

import { pickFallbackMessage, classifyFailure, type FailureReason } from "./fallback";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
  provider: "groq" | "gemini" | "openrouter" | "fallback";
  model: string;
  duration_ms: number;
  /** True when this result came from the graceful fallback path. */
  degraded?: boolean;
  /** Internal-only reason — never expose to clients. */
  degradedReason?: FailureReason;
}

export interface RouterOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: "groq" | "gemini" | "openrouter";
  /** Set true to force a fallback response without attempting providers. */
  forceFallback?: boolean;
}

// ─── Circuit breaker ─────────────────────────────────────────────────────
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface Circuit {
  state: CircuitState;
  failures: number;
  openedAt: number;
}

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000;

const circuits: Record<string, Circuit> = {
  groq:       { state: "CLOSED", failures: 0, openedAt: 0 },
  gemini:     { state: "CLOSED", failures: 0, openedAt: 0 },
  openrouter: { state: "CLOSED", failures: 0, openedAt: 0 },
};

function canCallProvider(name: string): boolean {
  const c = circuits[name];
  if (!c) return false;
  if (c.state === "CLOSED") return true;
  if (c.state === "OPEN") {
    if (Date.now() - c.openedAt > CIRCUIT_COOLDOWN_MS) {
      c.state = "HALF_OPEN";
      return true;
    }
    return false;
  }
  return true;
}

function recordSuccess(name: string): void {
  const c = circuits[name];
  if (c) { c.state = "CLOSED"; c.failures = 0; }
}

function recordFailure(name: string, fatal: boolean): void {
  const c = circuits[name];
  if (!c) return;
  c.failures += 1;
  if (fatal || c.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    c.state = "OPEN";
    c.openedAt = Date.now();
  }
}

// ─── Strict key validation ───────────────────────────────────────────────
// Each provider has a distinct key format. Reject anything that doesn't
// match — a malformed key that "looks non-empty" causes the exact
// "Missing Authentication header" 401 we are fixing.
interface KeySpec {
  envName: string;
  prefix: string | null;
  minLength: number;
}

const KEY_SPECS: Record<string, KeySpec> = {
  groq:       { envName: "GROQ_API_KEY",       prefix: "gsk_",      minLength: 20 },
  gemini:     { envName: "GEMINI_API_KEY",     prefix: "AIza",      minLength: 20 },
  openrouter: { envName: "OPENROUTER_API_KEY", prefix: "sk-or-v1-", minLength: 30 },
};

export interface KeyStatus {
  configured: boolean;
  reason?: FailureReason;
}

export function inspectKey(provider: string): KeyStatus {
  const spec = KEY_SPECS[provider];
  if (!spec) return { configured: false, reason: "missing_key" };

  const raw = process.env[spec.envName];
  if (!raw) return { configured: false, reason: "missing_key" };

  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "__SET_ME__") {
    return { configured: false, reason: "missing_key" };
  }
  if (trimmed.length < spec.minLength) {
    return { configured: false, reason: "malformed_key" };
  }
  if (spec.prefix && !trimmed.startsWith(spec.prefix)) {
    return { configured: false, reason: "malformed_key" };
  }
  return { configured: true };
}

function getKey(provider: string): string | null {
  const status = inspectKey(provider);
  if (!status.configured) return null;
  return process.env[KEY_SPECS[provider]!.envName]!.trim();
}

function origin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && url !== "__SET_ME__") return url.replace(/\/$/, "");
  return "https://setu-kalki.netlify.app";
}

// ─── Provider callers ────────────────────────────────────────────────────
async function callGroq(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = getKey("groq");
  if (!key) throw new Error("missing_groq_key");

  const model = "llama-3.1-8b-instant";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`groq_${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

async function callGemini(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = getKey("gemini");
  if (!key) throw new Error("missing_gemini_key");

  const model = "gemini-2.5-flash-lite";
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const systemInstruction = messages.find((m) => m.role === "system");

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`gemini_${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return { text: json.candidates?.[0]?.content?.parts?.[0]?.text ?? "", model };
}

async function callOpenRouter(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = getKey("openrouter");
  if (!key) throw new Error("missing_openrouter_key");

  const model = "meta-llama/llama-3.1-8b-instruct:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": origin(),
      "X-OpenRouter-Title": "Setu Kalki",
      "X-Title": "Setu Kalki",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`openrouter_${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

// ─── Router ──────────────────────────────────────────────────────────────
// Contract: NEVER throws. Always returns an LLMResult. When all providers
// fail, returns a degraded result with a graceful fallback message.
export async function routeLLM(opts: RouterOptions): Promise<LLMResult> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2048;

  // Short-circuit if caller forced fallback
  if (opts.forceFallback) {
    return {
      text: pickFallbackMessage(),
      provider: "fallback",
      model: "fallback",
      duration_ms: 0,
      degraded: true,
      degradedReason: "all_failed",
    };
  }

  // Collect available providers — only those with VALID keys
  const candidates: Array<"groq" | "gemini" | "openrouter"> = [];
  for (const p of ["groq", "gemini", "openrouter"] as const) {
    if (getKey(p) && canCallProvider(p)) candidates.push(p);
  }

  const chain = opts.preferredProvider && candidates.includes(opts.preferredProvider)
    ? [opts.preferredProvider, ...candidates.filter((p) => p !== opts.preferredProvider)]
    : candidates;

  let lastReason: FailureReason = "all_failed";
  const start = Date.now();

  for (const provider of chain) {
    try {
      let result: { text: string; model: string };
      if (provider === "groq") result = await callGroq(opts.messages, temperature, maxTokens);
      else if (provider === "gemini") result = await callGemini(opts.messages, temperature, maxTokens);
      else result = await callOpenRouter(opts.messages, temperature, maxTokens);

      recordSuccess(provider);
      return {
        text: result.text,
        provider,
        model: result.model,
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      const reason = classifyFailure(e, provider);
      const fatal = reason === "auth_rejected" || reason === "malformed_key";
      recordFailure(provider, fatal);
      lastReason = reason;
      console.warn(`[LLM Router] ${provider} failed (${reason}):`, e);
    }
  }

  // All providers failed — graceful degradation
  return {
    text: pickFallbackMessage(),
    provider: "fallback",
    model: "fallback",
    duration_ms: Date.now() - start,
    degraded: true,
    degradedReason: lastReason,
  };
}

// ─── Diagnostics ─────────────────────────────────────────────────────────
export function getProviderStatus(): Array<{
  provider: string;
  configured: boolean;
  circuit: CircuitState;
  reason?: FailureReason;
}> {
  return (["groq", "gemini", "openrouter"] as const).map((p) => {
    const status = inspectKey(p);
    return {
      provider: p,
      configured: status.configured,
      circuit: circuits[p]?.state ?? "OPEN",
      reason: status.reason,
    };
  });
}
