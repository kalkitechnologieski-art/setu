// lib/llm/router.ts
// Multi-provider LLM router with circuit breaker + semantic cache.
// Circuit states: CLOSED (normal) → OPEN (fail fast) → HALF_OPEN (probe).

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
  provider: "groq" | "gemini" | "openrouter" | "cache";
  model: string;
  duration_ms: number;
}

export interface RouterOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: "groq" | "gemini" | "openrouter";
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
  groq: { state: "CLOSED", failures: 0, openedAt: 0 },
  gemini: { state: "CLOSED", failures: 0, openedAt: 0 },
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
  return true; // HALF_OPEN
}

function recordSuccess(name: string): void {
  const c = circuits[name];
  if (c) { c.state = "CLOSED"; c.failures = 0; }
}

function recordFailure(name: string): void {
  const c = circuits[name];
  if (!c) return;
  c.failures += 1;
  if (c.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    c.state = "OPEN";
    c.openedAt = Date.now();
  }
}

// ─── Semantic cache ──────────────────────────────────────────────────────
const responseCache = new Map<string, { result: LLMResult; expires: number }>();
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 200;

function cacheKey(messages: LLMMessage[], temperature: number): string {
  const payload = JSON.stringify({ messages, temperature });
  // Simple hash — collisions are acceptable given the TTL
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash = hash & hash;
  }
  return String(hash);
}

function getCached(key: string): LLMResult | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { responseCache.delete(key); return null; }
  return entry.result;
}

function setCache(key: string, result: LLMResult): void {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  responseCache.set(key, { result, expires: Date.now() + CACHE_TTL_MS });
}

// ─── Environment resolution ──────────────────────────────────────────────
function getKey(name: string): string | null {
  const v = process.env[name];
  if (!v) return null;
  const t = v.trim();
  if (t === "" || t === "__SET_ME__" || t.length < 8) return null;
  return t;
}

function origin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && url !== "__SET_ME__") return url.replace(/\/$/, "");
  return "https://setu-kalki.netlify.app";
}

// ─── Provider callers ────────────────────────────────────────────────────
async function callGroq(messages: LLMMessage[], temperature: number, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = getKey("GROQ_API_KEY");
  if (!key) throw new Error("missing_groq_key");
  const model = "llama-3.1-8b-instant";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("groq_" + res.status + ": " + body.slice(0, 200));
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

async function callGemini(messages: LLMMessage[], temperature: number, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = getKey("GEMINI_API_KEY");
  if (!key) throw new Error("missing_gemini_key");
  const model = "gemini-2.5-flash-lite";
  const contents = messages.filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const systemInstruction = messages.find((m) => m.role === "system");
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("gemini_" + res.status + ": " + t.slice(0, 200));
  }
  const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return { text: json.candidates?.[0]?.content?.parts?.[0]?.text ?? "", model };
}

async function callOpenRouter(messages: LLMMessage[], temperature: number, maxTokens: number): Promise<{ text: string; model: string }> {
  const key = getKey("OPENROUTER_API_KEY");
  if (!key) throw new Error("missing_openrouter_key");
  const model = "meta-llama/llama-3.1-8b-instruct:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      "HTTP-Referer": origin(),
      "X-OpenRouter-Title": "Setu Kalki",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("openrouter_" + res.status + ": " + body.slice(0, 200));
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

// ─── Router ──────────────────────────────────────────────────────────────
export async function routeLLM(opts: RouterOptions): Promise<LLMResult> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2048;

  // Semantic cache check
  const key = cacheKey(opts.messages, temperature);
  const cached = getCached(key);
  if (cached) return cached;

  const available: Array<"groq" | "gemini" | "openrouter"> = [];
  if (getKey("GROQ_API_KEY") && canCallProvider("groq")) available.push("groq");
  if (getKey("GEMINI_API_KEY") && canCallProvider("gemini")) available.push("gemini");
  if (getKey("OPENROUTER_API_KEY") && canCallProvider("openrouter")) available.push("openrouter");

  if (available.length === 0) {
    throw new Error("No LLM provider available. Check API keys and circuit states.");
  }

  const chain = opts.preferredProvider && available.includes(opts.preferredProvider)
    ? [opts.preferredProvider, ...available.filter((p) => p !== opts.preferredProvider)]
    : available;

  let lastError: unknown = null;

  for (const provider of chain) {
    const start = Date.now();
    try {
      let result: { text: string; model: string };
      if (provider === "groq") result = await callGroq(opts.messages, temperature, maxTokens);
      else if (provider === "gemini") result = await callGemini(opts.messages, temperature, maxTokens);
      else result = await callOpenRouter(opts.messages, temperature, maxTokens);

      recordSuccess(provider);
      const llmResult: LLMResult = {
        text: result.text, provider,
        model: result.model,
        duration_ms: Date.now() - start,
      };
      setCache(key, llmResult);
      return llmResult;
    } catch (e) {
      lastError = e;
      recordFailure(provider);
      console.warn("[LLM Router] " + provider + " failed:", e);
    }
  }

  throw new Error("All LLM providers failed. Last error: " +
    (lastError instanceof Error ? lastError.message : String(lastError)));
}
