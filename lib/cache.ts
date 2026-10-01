// lib/cache.ts
// LRU + TTL cache. In-memory by default. Interface allows drop-in replacement
// with Upstash Redis by swapping getCache() implementation.

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

class MemoryCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    // LRU promotion
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);
    let count = 0;
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.store.delete(key);
        count += 1;
      }
    }
    return count;
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry && entry.expiresAt < now) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

let singleton: MemoryCache | null = null;

export function getCache(): MemoryCache {
  if (!singleton) singleton = new MemoryCache();
  return singleton;
}

export const CACHE_TTL = {
  short: 30_000,
  medium: 5 * 60_000,
  long: 60 * 60_000,
  day: 24 * 60 * 60_000,
} as const;

export const cache = {
  get: <T>(key: string): T | null => getCache().get<T>(key),
  set: <T>(key: string, value: T, ttlMs: number): void => getCache().set(key, value, ttlMs),
  delete: (key: string): void => getCache().delete(key),
  invalidate: (pattern: string): number => getCache().invalidatePattern(pattern),
  size: (): number => getCache().size(),
  clear: (): void => getCache().clear(),
  cleanup: (): number => getCache().cleanup(),
};

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  cache.set(key, value, ttlMs);
  return value;
}
