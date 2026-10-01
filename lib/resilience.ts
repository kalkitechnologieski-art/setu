// lib/resilience.ts
// ─────────────────────────────────────────────────────────────────────────
// Failure isolation primitives:
//   • CircuitBreaker — per-provider state machine
//   • Bulkhead       — semaphore-based concurrency limit
//   • withTimeout    — promise race against a timer
//   • withRetry      — exponential backoff with jitter
//   • ServiceResult  — discriminated union, never throws
// ─────────────────────────────────────────────────────────────────────────

export type FailureReason =
  | "circuit_open"
  | "bulkhead_full"
  | "timeout"
  | "auth_rejected"
  | "rate_limited"
  | "network_error"
  | "provider_error"
  | "not_configured"
  | "validation_error"
  | "unknown";

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
  provider: string;
  durationMs: number;
  traceId?: string;
  degraded?: boolean;
}

export interface ServiceFailure {
  ok: false;
  error: string;
  reason: FailureReason;
  provider: string;
  durationMs: number;
  traceId?: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

// ─── Circuit Breaker ─────────────────────────────────────────────────────
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitRecord {
  state: CircuitState;
  failures: number;
  openedAt: number;
  halfOpenProbes: number;
}

export interface CircuitConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenProbes: number;
}

const DEFAULT_CIRCUIT: CircuitConfig = {
  failureThreshold: 3,
  cooldownMs: 60_000,
  halfOpenProbes: 2,
};

export class CircuitBreaker {
  private readonly records = new Map<string, CircuitRecord>();
  private readonly config: CircuitConfig;

  constructor(config: Partial<CircuitConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT, ...config };
  }

  private get(key: string): CircuitRecord {
    let r = this.records.get(key);
    if (!r) {
      r = { state: "CLOSED", failures: 0, openedAt: 0, halfOpenProbes: 0 };
      this.records.set(key, r);
    }
    return r;
  }

  canAttempt(key: string): boolean {
    const r = this.get(key);
    if (r.state === "CLOSED") return true;
    if (r.state === "OPEN") {
      if (Date.now() - r.openedAt >= this.config.cooldownMs) {
        r.state = "HALF_OPEN";
        r.halfOpenProbes = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(key: string): void {
    const r = this.get(key);
    if (r.state === "HALF_OPEN") {
      r.halfOpenProbes += 1;
      if (r.halfOpenProbes >= this.config.halfOpenProbes) {
        r.state = "CLOSED";
        r.failures = 0;
        r.halfOpenProbes = 0;
      }
    } else {
      r.failures = 0;
    }
  }

  recordFailure(key: string, fatal: boolean = false): void {
    const r = this.get(key);
    r.failures += 1;
    if (fatal || r.failures >= this.config.failureThreshold || r.state === "HALF_OPEN") {
      r.state = "OPEN";
      r.openedAt = Date.now();
    }
  }

  state(key: string): CircuitState {
    return this.get(key).state;
  }

  snapshot(): Array<{ key: string; state: CircuitState; failures: number }> {
    const out: Array<{ key: string; state: CircuitState; failures: number }> = [];
    for (const [key, r] of this.records.entries()) {
      out.push({ key, state: r.state, failures: r.failures });
    }
    return out;
  }

  reset(key?: string): void {
    if (key) this.records.delete(key);
    else this.records.clear();
  }
}

// ─── Bulkhead ────────────────────────────────────────────────────────────
export class Bulkhead {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  utilisation(): { active: number; queued: number; max: number } {
    return { active: this.active, queued: this.queue.length, max: this.maxConcurrent };
  }
}

// ─── Timeout ─────────────────────────────────────────────────────────────
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}_timeout_${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

// ─── Retry ───────────────────────────────────────────────────────────────
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg: RetryConfig = { ...DEFAULT_RETRY, ...config };
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === cfg.maxAttempts) break;
      const exp = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(2, attempt - 1));
      const delay = cfg.jitter ? exp * (0.5 + Math.random() * 0.5) : exp;
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Failure classification ──────────────────────────────────────────────
export function classifyFailure(error: unknown, provider: string): FailureReason {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("429") || lower.includes("rate limit")) return "rate_limited";
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("authentication")
  ) return "auth_rejected";
  if (lower.includes("not_configured") || lower.includes("missing_")) return "not_configured";
  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused")
  ) return "network_error";
  if (lower.includes("invalid") || lower.includes("validation")) return "validation_error";
  if (lower.includes(provider.toLowerCase())) return "provider_error";
  return "unknown";
}

// ─── Simple sleep ────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
