// lib/siddhi/router.ts
// Tool-calling LLM router. Same fail-fast, key-presence-aware semantics as
// lib/llm/router.ts. Only providers with keys set are tried.
import type {
  SiddhiMessage,
  SiddhiProviderResult,
  SiddhiToolCall,
} from "./types";
import { toolsForLLM } from "./tools";

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: SiddhiToolCall[] };
  }>;
}

interface ProviderConfig {
  name: "groq" | "agnes" | "openrouter";
  url: string;
  model: string;
  keyEnv: string;
  supportsTools: boolean;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    keyEnv: "GROQ_API_KEY",
    supportsTools: true,
  },
  {
    name: "agnes",
    url: process.env.AGNES_API_URL ?? "https://api.agnes-ai.cn/v1/chat/completions",
    model: process.env.AGNES_MODEL ?? "agnes-2.0-flash",
    keyEnv: "AGNES_API_KEY",
    supportsTools: true,
  },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    keyEnv: "OPENROUTER_API_KEY",
    supportsTools: false,
  },
];

function hasKey(name: string): boolean {
  const v = process.env[name];
  return Boolean(v && v !== "__SET_ME__" && v.trim() !== "");
}

function origin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url && url !== "__SET_ME__") return url.replace(/\/$/, "");
  return "https://steady-croissant-9cbbbf.netlify.app";
}

async function callProvider(
  provider: ProviderConfig,
  messages: SiddhiMessage[],
  withTools: boolean
): Promise<SiddhiProviderResult> {
  const key = process.env[provider.keyEnv];
  if (!key || key === "__SET_ME__") throw new Error(`missing_${provider.keyEnv}`);

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map((m) => {
      const out: Record<string, unknown> = {
        role: m.role,
        content: m.content || null,
      };
      if (m.tool_calls) out.tool_calls = m.tool_calls;
      if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
      if (m.name) out.name = m.name;
      return out;
    }),
    temperature: 0.4,
    max_tokens: 1024,
  };

  if (withTools && provider.supportsTools) {
    body.tools = toolsForLLM();
    body.tool_choice = "auto";
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  // OpenRouter requires these for browser-origin requests
  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = origin();
    headers["X-Title"] = "Setu Kalki";
  }

  const res = await fetch(provider.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.name}_${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as OpenAIChatResponse;
  const choice = json.choices?.[0]?.message;
  const text = choice?.content ?? "";
  const toolCalls = choice?.tool_calls;

  return {
    text,
    provider: provider.name,
    model: provider.model,
    toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
  };
}

export async function callSiddhiLLM(
  messages: SiddhiMessage[],
  withTools = true
): Promise<SiddhiProviderResult> {
  const available = PROVIDERS.filter((p) => hasKey(p.keyEnv));

  if (available.length === 0) {
    throw new Error(
      "No LLM provider configured. Add GROQ_API_KEY, AGNES_API_KEY, or OPENROUTER_API_KEY to Netlify environment variables."
    );
  }

  let lastError: unknown = null;

  for (const provider of available) {
    try {
      return await callProvider(provider, messages, withTools);
    } catch (e) {
      lastError = e;
      console.warn(`[siddhi] ${provider.name} failed:`, e);
    }
  }

  throw new Error(
    `All configured LLM providers failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
