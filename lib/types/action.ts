// lib/types/action.ts
// ═══════════════════════════════════════════════════════════════════════════
// Action Result Pattern — the industry-standard discriminated union for
// Server Actions. Consumers narrow on `success` and get full type safety.
//
//   if (result.success) result.data   // ✅ typed T
//   else                result.error  // ✅ typed ActionErrorCode
//
// Why a discriminated union beats throwing:
//   • Compile-time exhaustion: switch on success, TypeScript covers both sides
//   • No unhandled rejections in Client Components
//   • Errors are values — serialisable across the RSC boundary
//   • Prevents leaking stack traces / SQL errors to the browser
// ═══════════════════════════════════════════════════════════════════════════

/** Every failure mode an action can return. Never widen without a migration. */
export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export interface ActionFailure {
  success: false;
  error: ActionErrorCode;
  message: string;
  /** Field-level errors from Zod — shape matches the input schema. */
  fieldErrors?: Record<string, string[]>;
  /** Correlation ID for tracing the failure server-side. */
  correlationId?: string;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

// ─── Helpers ──────────────────────────────────────────────────────────────

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function actionFailure(
  error: ActionErrorCode,
  message: string,
  extras: Partial<Pick<ActionFailure, "fieldErrors" | "correlationId">> = {}
): ActionFailure {
  return { success: false, error, message, ...extras };
}

export function isActionSuccess<T>(
  r: ActionResult<T>
): r is ActionSuccess<T> {
  return r.success;
}

export function isActionFailure<T>(
  r: ActionResult<T>
): r is ActionFailure {
  return !r.success;
}

// ─── Error code → safe user message map ───────────────────────────────────

export const ACTION_ERROR_MESSAGES: Record<ActionErrorCode, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields.",
  UNAUTHORIZED:     "You need to sign in to continue.",
  FORBIDDEN:        "You do not have permission to perform this action.",
  NOT_FOUND:        "We could not find what you were looking for.",
  CONFLICT:         "That resource already exists.",
  RATE_LIMITED:     "Too many requests. Please try again in a moment.",
  UPSTREAM_ERROR:   "A downstream service is temporarily unavailable.",
  INTERNAL_ERROR:   "Something went wrong. Please try again.",
};
