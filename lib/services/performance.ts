// lib/services/performance.ts — Performance Marketing (Siddhi)
import {
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  classifyFailure,
  type ServiceResult,
} from "@/lib/resilience";
import { getServiceBus, type ServiceHealth, type ServiceId } from "./bus";

const ID: ServiceId = "performance";
const NAME = "Performance Marketing (Siddhi)";
const ACTIONS = ["fetchMetrics", "reallocate", "pause"] as const;

const circuit = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 120_000 });
const bulkhead = new Bulkhead(4);

function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET);
}
function metaConfigured(): boolean {
  return !!(process.env.META_ADS_CLIENT_ID && process.env.META_ADS_CLIENT_SECRET);
}
function anyConfigured(): boolean {
  return googleConfigured() || metaConfigured();
}

async function invoke(
  action: string,
  _payload: unknown
): Promise<ServiceResult<unknown>> {
  const start = Date.now();

  if (!anyConfigured()) {
    return {
      ok: false,
      error: "No ad platform configured",
      reason: "not_configured",
      provider: "ads",
      durationMs: 0,
    };
  }

  const provider = googleConfigured() ? "google_ads" : "meta_ads";
  if (!circuit.canAttempt(provider)) {
    return {
      ok: false,
      error: `${provider} circuit open`,
      reason: "circuit_open",
      provider,
      durationMs: 0,
    };
  }

  try {
    const result = await bulkhead.run(() =>
      withTimeout(
        Promise.resolve({ stub: true, action }),
        20_000,
        `${ID}.${action}`
      )
    );
    circuit.recordSuccess(provider);
    return {
      ok: true,
      data: result,
      provider,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    const reason = classifyFailure(e, provider);
    circuit.recordFailure(provider, reason === "auth_rejected");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Performance action failed",
      reason,
      provider,
      durationMs: Date.now() - start,
    };
  }
}

async function healthCheck(): Promise<ServiceHealth> {
  const ga = googleConfigured();
  const ma = metaConfigured();
  const configured = ga || ma;
  return {
    id: ID,
    name: NAME,
    ready: configured,
    configured,
    degraded: !ga || !ma,
    providers: [
      { name: "google_ads", configured: ga, circuit: circuit.state("google_ads") },
      { name: "meta_ads", configured: ma, circuit: circuit.state("meta_ads") },
    ],
    bulkhead: bulkhead.utilisation(),
    missingCapabilities: configured
      ? []
      : ["GOOGLE_ADS_CLIENT_ID", "META_ADS_CLIENT_ID"],
  };
}

export function registerPerformanceService(): void {
  getServiceBus().register({
    id: ID,
    name: NAME,
    actions: ACTIONS,
    invoke,
    healthCheck,
  });
}
