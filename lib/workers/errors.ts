// lib/workers/errors.ts
import type { WorkerError, WorkerErrorCode } from "@/lib/types";

export class WorkerFailure extends Error {
  public readonly code: WorkerErrorCode;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: WorkerErrorCode,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "WorkerFailure";
    this.code = code;
    this.retryable = options.retryable ?? isRetryableCode(code);
    this.details = options.details;
  }

  toWorkerError(provider?: string): WorkerError {
    return {
      code: this.code,
      message: this.message,
      provider,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

function isRetryableCode(code: WorkerErrorCode): boolean {
  switch (code) {
    case "PROVIDER_UNAVAILABLE":
    case "PROVIDER_RATE_LIMITED":
    case "MCP_CALL_FAILED":
    case "TIMEOUT":
      return true;
    case "CONFIG_MISSING":
    case "VALIDATION_FAILED":
    case "APPROVAL_REJECTED":
    case "UNKNOWN":
    default:
      return false;
  }
}

export function toWorkerError(e: unknown): WorkerError {
  if (e instanceof WorkerFailure) return e.toWorkerError();
  if (e instanceof Error) {
    return { code: "UNKNOWN", message: e.message, retryable: false };
  }
  return { code: "UNKNOWN", message: String(e), retryable: false };
}
