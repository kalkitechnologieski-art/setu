// lib/services/calling.ts — AI Calling service (Meera)
import {
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  withRetry,
  classifyFailure,
  type ServiceResult,
} from "@/lib/resilience";
import { getServiceBus, type ServiceHealth, type ServiceId } from "./bus";

const ID: ServiceId = "calling";
const NAME = "AI Calling (Meera)";
const ACTIONS = ["call", "sendSms"] as const;

const circuit = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 90_000 });
const bulkhead = new Bulkhead(3);

function configured(): boolean {
  const k = process.env.AGENTCALL_API_KEY;
  return !!k && k !== "__SET_ME__" && k.length > 5;
}

interface CallPayload {
  to: string;
  script?: string;
}

async function callAgentCall(params: CallPayload): Promise<{ callId: string }> {
  const key = process.env.AGENTCALL_API_KEY;
  if (!key) throw new Error("missing_agentcall_key");

  const res = await fetch("https://api.agentcall.co/v1/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.to,
      from: process.env.AGENTCALL_FROM_NUMBER,
      script: params.script ?? "",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`agentcall_${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as { callId: string };
}

async function invoke(
  action: string,
  payload: unknown
): Promise<ServiceResult<unknown>> {
  const start = Date.now();

  if (!configured()) {
    return {
      ok: false,
      error: "AgentCall not configured",
      reason: "not_configured",
      provider: "agentcall",
      durationMs: 0,
    };
  }
  if (!circuit.canAttempt("agentcall")) {
    return {
      ok: false,
      error: "AgentCall circuit open",
      reason: "circuit_open",
      provider: "agentcall",
      durationMs: 0,
    };
  }

  const p = payload as CallPayload;
  if (!p.to) {
    return {
      ok: false,
      error: "Missing required field: to",
      reason: "validation_error",
      provider: "agentcall",
      durationMs: 0,
    };
  }

  try {
    const result = await bulkhead.run(() =>
      withTimeout(
        withRetry(() => callAgentCall(p), { maxAttempts: 2, baseDelayMs: 800 }),
        30_000,
        `${ID}.${action}`
      )
    );
    circuit.recordSuccess("agentcall");
    return {
      ok: true,
      data: result,
      provider: "agentcall",
      durationMs: Date.now() - start,
    };
  } catch (e) {
    const reason = classifyFailure(e, "agentcall");
    circuit.recordFailure("agentcall", reason === "auth_rejected");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Call failed",
      reason,
      provider: "agentcall",
      durationMs: Date.now() - start,
    };
  }
}

async function healthCheck(): Promise<ServiceHealth> {
  const c = configured();
  return {
    id: ID,
    name: NAME,
    ready: c,
    configured: c,
    degraded: false,
    providers: [{ name: "agentcall", configured: c, circuit: circuit.state("agentcall") }],
    bulkhead: bulkhead.utilisation(),
    missingCapabilities: c ? [] : ["AGENTCALL_API_KEY"],
  };
}

export function registerCallingService(): void {
  getServiceBus().register({
    id: ID,
    name: NAME,
    actions: ACTIONS,
    invoke,
    healthCheck,
  });
}
