// lib/rate-limit.ts
// Sliding window rate limiter. In-memory. Interface allows swap to Redis.

interface Bucket {
  count: number;
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterMs: number;
}

class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    const allowed = bucket.count <= limit;
    const resetAt = bucket.windowStart + windowMs;
    return {
      allowed,
      remaining: Math.max(0, limit - bucket.count),
      limit,
      resetAt,
      retryAfterMs: allowed ? 0 : Math.max(0, resetAt - now),
    };
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keys = Array.from(this.buckets.keys());
    for (const key of keys) {
      const bucket = this.buckets.get(key);
      if (bucket && now - bucket.windowStart > 60 * 60 * 1000) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

let singleton: RateLimiter | null = null;

function getLimiter(): RateLimiter {
  if (!singleton) singleton = new RateLimiter();
  return singleton;
}

export const RATE_LIMITS = {
  api: { scope: "user" as const, limit: 60, windowMs: 60_000 },
  email: { scope: "org" as const, limit: 100, windowMs: 60 * 60_000 },
  call: { scope: "org" as const, limit: 20, windowMs: 60 * 60_000 },
  lead: { scope: "org" as const, limit: 50, windowMs: 24 * 60 * 60_000 },
  llm: { scope: "org" as const, limit: 1000, windowMs: 24 * 60 * 60_000 },
  enrichment: { scope: "org" as const, limit: 500, windowMs: 24 * 60 * 60_000 },
} as const;

export type RateLimitKind = keyof typeof RATE_LIMITS;

export function checkRate(
  kind: RateLimitKind,
  identifier: string
): RateLimitResult {
  const cfg = RATE_LIMITS[kind];
  return getLimiter().check(`${kind}:${identifier}`, cfg.limit, cfg.windowMs);
}

export function resetRate(kind: RateLimitKind, identifier: string): void {
  getLimiter().reset(`${kind}:${identifier}`);
}

export function cleanupRateLimits(): number {
  return getLimiter().cleanup();
}
