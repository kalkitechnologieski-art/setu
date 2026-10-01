// lib/services/leads.ts — AI Lead Gen service (Arjun)
import {
  CircuitBreaker,
  Bulkhead,
  withTimeout,
  withRetry,
  classifyFailure,
  type ServiceResult,
} from "@/lib/resilience";
import { getServiceBus, type ServiceHealth, type ServiceId } from "./bus";

const ID: ServiceId = "leads";
const NAME = "AI Lead Gen (Arjun)";
const ACTIONS = ["search"] as const;

const circuit = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 60_000 });
const bulkhead = new Bulkhead(2);

function configured(): boolean {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  return !!k && k !== "__SET_ME__" && k.length > 10;
}

interface SearchPayload {
  query: string;
  location: string;
}

interface PlacesResult {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
}

async function callPlaces(params: SearchPayload): Promise<PlacesResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("missing_places_key");

  const query = encodeURIComponent(`${params.query} in ${params.location}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`places_${res.status}`);

  const json = (await res.json()) as {
    results?: Array<{
      place_id: string;
      name: string;
      formatted_address: string;
      rating?: number;
    }>;
  };

  return (json.results ?? []).map((r) => ({
    place_id: r.place_id,
    name: r.name,
    address: r.formatted_address,
    rating: r.rating,
  }));
}

async function invoke(
  action: string,
  payload: unknown
): Promise<ServiceResult<unknown>> {
  const start = Date.now();

  if (!configured()) {
    return {
      ok: false,
      error: "Google Places not configured",
      reason: "not_configured",
      provider: "google_places",
      durationMs: 0,
    };
  }
  if (!circuit.canAttempt("google_places")) {
    return {
      ok: false,
      error: "Places circuit open",
      reason: "circuit_open",
      provider: "google_places",
      durationMs: 0,
    };
  }

  const p = payload as SearchPayload;
  if (!p.query || !p.location) {
    return {
      ok: false,
      error: "Missing required fields: query, location",
      reason: "validation_error",
      provider: "google_places",
      durationMs: 0,
    };
  }

  try {
    const result = await bulkhead.run(() =>
      withTimeout(
        withRetry(() => callPlaces(p), { maxAttempts: 2, baseDelayMs: 600 }),
        15_000,
        `${ID}.${action}`
      )
    );
    circuit.recordSuccess("google_places");
    return {
      ok: true,
      data: result,
      provider: "google_places",
      durationMs: Date.now() - start,
    };
  } catch (e) {
    const reason = classifyFailure(e, "google_places");
    circuit.recordFailure("google_places", reason === "auth_rejected");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lead search failed",
      reason,
      provider: "google_places",
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
    providers: [{ name: "google_places", configured: c, circuit: circuit.state("google_places") }],
    bulkhead: bulkhead.utilisation(),
    missingCapabilities: c ? [] : ["GOOGLE_PLACES_API_KEY"],
  };
}

export function registerLeadsService(): void {
  getServiceBus().register({
    id: ID,
    name: NAME,
    actions: ACTIONS,
    invoke,
    healthCheck,
  });
}
