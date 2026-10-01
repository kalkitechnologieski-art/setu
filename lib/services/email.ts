// lib/services/email.ts — AI Email service (Kabir)
import {
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  withRetry,
  classifyFailure,
  type ServiceResult,
} from "@/lib/resilience";
import { getServiceBus, type ServiceHealth, type ServiceId } from "./bus";

const ID: ServiceId = "email";
const NAME = "AI Email (Kabir)";
const ACTIONS = ["send", "sendBatch"] as const;

const circuit = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });
const bulkhead = new Bulkhead(5);

function configured(): boolean {
  const k = process.env.RESEND_API_KEY;
  return !!k && k.startsWith("re_") && k.length > 10;
}

interface SendPayload {
  to: string;
  subject: string;
  body: string;
}

async function callResend(params: SendPayload): Promise<{ id: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("missing_resend_key");
  const from = process.env.RESEND_FROM ?? "noreply@setu-kalki.app";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`resend_${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as { id: string };
}

async function invoke(
  action: string,
  payload: unknown
): Promise<ServiceResult<unknown>> {
  const start = Date.now();

  if (!configured()) {
    return {
      ok: false,
      error: "Resend not configured",
      reason: "not_configured",
      provider: "resend",
      durationMs: 0,
    };
  }
  if (!circuit.canAttempt("resend")) {
    return {
      ok: false,
      error: "Resend circuit open",
      reason: "circuit_open",
      provider: "resend",
      durationMs: 0,
    };
  }

  const p = payload as SendPayload;
  if (!p.to || !p.subject || !p.body) {
    return {
      ok: false,
      error: "Missing required fields: to, subject, body",
      reason: "validation_error",
      provider: "resend",
      durationMs: 0,
    };
  }

  try {
    const result = await bulkhead.run(() =>
      withTimeout(
        withRetry(() => callResend(p), { maxAttempts: 2, baseDelayMs: 500 }),
        10_000,
        `${ID}.${action}`
      )
    );
    circuit.recordSuccess("resend");
    return {
      ok: true,
      data: result,
      provider: "resend",
      durationMs: Date.now() - start,
    };
  } catch (e) {
    const reason = classifyFailure(e, "resend");
    circuit.recordFailure("resend", reason === "auth_rejected");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Email send failed",
      reason,
      provider: "resend",
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
    providers: [{ name: "resend", configured: c, circuit: circuit.state("resend") }],
    bulkhead: bulkhead.utilisation(),
    missingCapabilities: c ? [] : ["RESEND_API_KEY"],
  };
}

export function registerEmailService(): void {
  getServiceBus().register({
    id: ID,
    name: NAME,
    actions: ACTIONS,
    invoke,
    healthCheck,
  });
}
