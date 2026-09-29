// lib/llm/router.ts
// ─────────────────────────────────────────────────────────────────────────
// Multi-provider LLM router with fail-fast semantics.
//
// Providers are only tried when their API key is BOTH present AND valid
// (not empty, not "__SET_ME__", not fewer than 8 chars).
//
// OpenRouter requires HTTP-Referer and X-OpenRouter-Title headers for
// browser-origin requests — without them it returns 401 "Missing
// Authentication header" even with a valid API key.
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
  return "https://steady-croissant-9cbbbf.netlify.app";
}

// ─── Provider callers ────────────────────────────────────────────────────

async function callGroq(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<{ text: string; model: string }> {
  const key = getKey("GROQ_API_KEY");
  if (!key) throw new Error("missing_groq_key");

  const model = "llama-3.1-8b-instant";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
  const key = getKey("GEMINI_API_KEY");
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
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
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
  const key = getKey("OPENROUTER_API_KEY");
  if (!key) throw new Error("missing_openrouter_key");

  const model = "meta-llama/llama-3.1-8b-instruct:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // REQUIRED — OpenRouter returns 401 without these
      "HTTP-Referer": origin(),
      "X-OpenRouter-Title": "Setu Kalki",
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

  const available: Array<"groq" | "gemini" | "openrouter"> = [];
  if (getKey("GROQ_API_KEY")) available.push("groq");
  if (getKey("GEMINI_API_KEY")) available.push("gemini");
  if (getKey("OPENROUTER_API_KEY")) available.push("openrouter");

  if (available.length === 0) {
    throw new Error(
      "No LLM provider configured. Add GROQ_API_KEY (recommended), GEMINI_API_KEY, or OPENROUTER_API_KEY."
    );
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
