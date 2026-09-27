// lib/auth/result.ts
// ───────────────────────────────────────────────────────────────────────────
// Discriminated union returned by every auth Server Action.
// Consumers narrow on `ok` and get full type safety.
// ───────────────────────────────────────────────────────────────────────────
export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_CONFIRMED"
  | "EMAIL_IN_USE"
  | "RATE_LIMITED"
  | "WEAK_PASSWORD"
  | "SESSION_EXPIRED"
  | "OAUTH_ERROR"
  | "UPSTREAM_ERROR"
  | "UNKNOWN";

export interface AuthSuccess {
  ok: true;
  message?: string;
  redirectTo?: string;
  /** Set when the action needs the UI to remain on a "check your email" view. */
  needsEmailConfirmation?: boolean;
}

export interface AuthFailure {
  ok: false;
  code: AuthErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type AuthResult = AuthSuccess | AuthFailure;

export function authSuccess(extras: Omit<AuthSuccess, "ok"> = {}): AuthSuccess {
  return { ok: true, ...extras };
}

export function authFailure(
  code: AuthErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
): AuthFailure {
  return { ok: false, code, message, fieldErrors };
}

/** Safe, user-facing message per error code. */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  EMAIL_NOT_CONFIRMED: "Please confirm your email before signing in.",
  EMAIL_IN_USE: "An account with this email already exists.",
  RATE_LIMITED: "Too many attempts. Please try again in a few minutes.",
  WEAK_PASSWORD: "That password is too weak. Try a stronger one.",
  SESSION_EXPIRED: "Your session expired. Please sign in again.",
  OAUTH_ERROR: "Sign-in with that provider failed. Try another method.",
  UPSTREAM_ERROR: "Authentication service is temporarily unavailable.",
  UNKNOWN: "Something went wrong. Please try again.",
};
