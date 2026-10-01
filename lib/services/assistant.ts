// lib/services/assistant.ts — Siddhi Assistant (orchestrator)
import {
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  classifyFailure,
  type ServiceResult,
} from "@/lib/resilience";
import { getServiceBus, type ServiceHealth, type ServiceId } from "./bus";

const ID: ServiceId = "assistant";
const NAME = "Siddhi Assistant";
const ACTIONS = ["chat"] as const;

const circuit = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30_000 });
const bulkhead = new Bulkhead(10);

interface ChatPayload {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

function anyLlmConfigured(): boolean {
  const groq = process.env.GROQ_API_KEY ?? "";
  const gemini = process.env.GEMINI_API_KEY ?? "";
  const or = process.env.OPENROUTER_API_KEY ?? "";
  return (
    (groq.startsWith("gsk_") && groq.length > 20) ||
    (gemini.startsWith("AIza") && gemini.length > 20) ||
    (or.startsWith("sk-or-v1-") && or.length > 30)
  );
}

async function invoke(
  action: string,
  payload: unknown
): Promise<ServiceResult<unknown>> {
  const start = Date.now();

  if (!anyLlmConfigured()) {
    return {
      ok: false,
      error: "No LLM provider configured",
      reason: "not_configured",
      provider: "llm",
      durationMs: 0,
    };
  }

  if (!circuit.canAttempt("llm")) {
    return {
      ok: false,
      error: "All LLM providers cooling down",
      reason: "circuit_open",
      provider: "llm",
      durationMs: 0,
    };
  }

  const p = payload as ChatPayload;
  if (!p.messages || p.messages.length === 0) {
    return {
      ok: false,
      error: "Missing required field: messages",
      reason: "validation_error",
      provider: "llm",
      durationMs: 0,
    };
  }

  try {
    const result = await bulkhead.run(() =>
      withTimeout(
        (async (): Promise<{ text: string; provider: string; model: string }> => {
          const { routeLLM } = await import("@/lib/llm/router");
          const r = await routeLLM({
            messages: p.messages,
            temperature: p.temperature ?? 0.7,
            maxTokens: p.maxTokens ?? 2048,
          });
          return { text: r.text, provider: r.provider, model: r.model };
        })(),
        30_000,
        `${ID}.${action}`
      )
    );

    const degraded = result.provider === "fallback";
    if (degraded) circuit.recordFailure("llm");
    else circuit.recordSuccess("llm");

    return {
      ok: true,
      data: result,
      provider: result.provider,
      durationMs: Date.now() - start,
      degraded,
    };
  } catch (e) {
    const reason = classifyFailure(e, "llm");
    circuit.recordFailure("llm", reason === "auth_rejected");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Assistant failed",
      reason,
      provider: "llm",
      durationMs: Date.now() - start,
    };
  }
}

async function healthCheck(): Promise<ServiceHealth> {
  const configured = anyLlmConfigured();
  const providers: Array<{ name: string; configured: boolean; circuit: string }> = [];

  try {
    const { getProviderStatus } = await import("@/lib/llm/router");
    for (const p of getProviderStatus()) {
      providers.push({
        name: p.provider,
        configured: p.configured,
        circuit: p.circuit,
      });
    }
  } catch {
    /* router unavailable — fall through with empty providers */
  }

  return {
    id: ID,
    name: NAME,
    ready: configured,
    configured,
    degraded: providers.filter((p) => p.configured).length < 2,
    providers,
    bulkhead: bulkhead.utilisation(),
    missingCapabilities: configured
      ? []
      : ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"],
  };
}

export function registerAssistantService(): void {
  getServiceBus().register({
    id: ID,
    name: NAME,
    actions: ACTIONS,
    invoke,
    healthCheck,
  });
}
