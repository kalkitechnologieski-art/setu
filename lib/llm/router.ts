// lib/llm/router.ts
// ─────────────────────────────────────────────────────────────────────────
// Multi-provider LLM router with fail-fast semantics.
//
// Providers are only tried if their API key is actually set. This prevents
// the "All providers failed" error when one key is missing.
//
// OpenRouter requires HTTP-Referer and X-Title headers for browser-origin
// requests — otherwise it returns 401 "Missing Authentication header".
// ─────────────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
  provider: "groq" | "gemini" | "openrouter";
  model: string;
  duration_ms: number;
}

export interface RouterOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: "groq" | "gemini" | "openrouter";
}

// ─── Environment resolution (checked once at call time) ──────────────────

function getKey(name: string): string | null {
  const v = process.env[name];
  if (!v || v === "__SET_ME__" || v.trim() === "") return null;
  return v.trim();
}

const GROQ_KEY = () => getKey("GROQ_API_KEY");
const GEMINI_KEY = () => getKey("GEMINI_API_KEY");
const OPENROUTER_KEY = () => getKey("OPENROUTER_API_KEY");

function origin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && url !== "__SET_ME__") return url.replace(/\/$/, "");
  return "https://steady-croissant-9cbbbf.netlify.app";
}

// ─── Provider callers ────────────────────────────────────────────────────

async function callGroq(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = GROQ_KEY();
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

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

async function callGemini(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = GEMINI_KEY();
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
  return {
    text: json.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    model,
  };
}

async function callOpenRouter(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = OPENROUTER_KEY();
  if (!key) throw new Error("missing_openrouter_key");

  const model = "meta-llama/llama-3.1-8b-instruct:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // REQUIRED for browser-origin requests — OpenRouter returns
      // 401 "Missing Authentication header" without these.
      "HTTP-Referer": origin(),
      "X-Title": "Setu Kalki",
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`openrouter_${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return { text: json.choices?.[0]?.message?.content ?? "", model };
}

// ─── Router ──────────────────────────────────────────────────────────────

export async function routeLLM(opts: RouterOptions): Promise<LLMResult> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2048;

  // Build the chain from providers whose keys are actually set.
  const available: Array<"groq" | "gemini" | "openrouter"> = [];
  if (GROQ_KEY()) available.push("groq");
  if (GEMINI_KEY()) available.push("gemini");
  if (OPENROUTER_KEY()) available.push("openrouter");

  if (available.length === 0) {
    throw new Error(
      "No LLM provider configured. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY."
    );
  }

  // Prefer the requested provider if available, then the rest in order.
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

      return {
        text: result.text,
        provider,
        model: result.model,
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      lastError = e;
      console.warn(`[LLM Router] ${provider} failed:`, e);
    }
  }

  throw new Error(
    `All configured LLM providers failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
