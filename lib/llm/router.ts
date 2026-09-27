// lib/llm/router.ts
import { PROVIDER_CHAIN, PROVIDERS, type ProviderName } from "./providers";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResult {
  text: string;
  provider: ProviderName;
  model: string;
  duration_ms: number;
}

export interface RouterOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: ProviderName;
}

class ProviderError extends Error {
  constructor(public provider: ProviderName, public status: number, message: string) {
    super(`[${provider}] ${status}: ${message}`);
    this.name = "ProviderError";
  }
}

async function callGroq(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const cfg = PROVIDERS.groq;
  const key = process.env[cfg.envKey];
  if (!key || key === "__SET_ME__") throw new ProviderError("groq", 0, "no key");

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ProviderError("groq", res.status, body);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const cfg = PROVIDERS.gemini;
  const key = process.env[cfg.envKey];
  if (!key || key === "__SET_ME__") throw new ProviderError("gemini", 0, "no key");

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
    `${cfg.endpoint}/${cfg.model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new ProviderError("gemini", res.status, body);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callOpenRouter(
  messages: LLMMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const cfg = PROVIDERS.openrouter;
  const key = process.env[cfg.envKey];
  if (!key || key === "__SET_ME__") throw new ProviderError("openrouter", 0, "no key");

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Setu Kalki",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new ProviderError("openrouter", res.status, body);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

const CALLERS: Record<
  ProviderName,
  (m: LLMMessage[], t: number, k: number) => Promise<string>
> = {
  groq: callGroq,
  gemini: callGemini,
  openrouter: callOpenRouter,
};

export async function routeLLM(opts: RouterOptions): Promise<LLMResult> {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 2048;

  const chain = opts.preferredProvider
    ? [opts.preferredProvider, ...PROVIDER_CHAIN.filter((p) => p !== opts.preferredProvider)]
    : PROVIDER_CHAIN;

  let lastError: unknown = null;

  for (const provider of chain) {
    const start = Date.now();
    try {
      const text = await CALLERS[provider](opts.messages, temperature, maxTokens);
      return {
        text,
        provider,
        model: PROVIDERS[provider].model,
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[LLM Router] ${provider} failed: ${msg}`);
      continue;
    }
  }

  throw new Error(
    `All LLM providers failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
