// lib/workers/retry.ts
import { WorkerFailure } from "./errors";

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const retryable = e instanceof WorkerFailure ? e.retryable : false;
      if (!retryable || attempt === opts.maxAttempts) throw e;

      const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1));
      const delay = opts.jitter ? exp * (0.5 + Math.random() * 0.5) : exp;
      opts.onRetry?.(attempt, e, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return Promise.race<T>([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new WorkerFailure("TIMEOUT", `${label} timed out after ${timeoutMs}ms`, {
              retryable: true,
            })
          ),
        timeoutMs
      )
    ),
  ]);
}
