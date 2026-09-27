// lib/auth/pkce.ts
// ═══════════════════════════════════════════════════════════════════════════
// PKCE + state helpers for platform OAuth flows.
//
// PKCE (RFC 7636) is mandatory in OAuth 2.1. It prevents authorization-code
// interception attacks because the code_verifier never leaves the server.
//
// `state` prevents CSRF: a random value stored in a cookie must match the
// value returned by the provider.
//
// We store both in httpOnly, short-lived cookies (10 min) that only the
// start and callback routes can read.
// ═══════════════════════════════════════════════════════════════════════════
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const OAUTH_STATE_COOKIE = "setu_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "setu_oauth_verifier";
export const OAUTH_NEXT_COOKIE = "setu_oauth_next";
const COOKIE_MAX_AGE = 600; // 10 minutes

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(32));
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Write state + verifier + optional next into httpOnly cookies. */
export async function setOAuthCookies(
  state: string,
  verifier: string,
  next: string
): Promise<void> {
  const store = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
  store.set(OAUTH_STATE_COOKIE, state, opts);
  store.set(OAUTH_VERIFIER_COOKIE, verifier, opts);
  store.set(OAUTH_NEXT_COOKIE, next, opts);
}

/** Read the OAuth cookies and clear them. */
export async function consumeOAuthCookies(): Promise<{
  state: string | null;
  verifier: string | null;
  next: string | null;
}> {
  const store = await cookies();
  const state = store.get(OAUTH_STATE_COOKIE)?.value ?? null;
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value ?? null;
  const next = store.get(OAUTH_NEXT_COOKIE)?.value ?? null;
  store.delete(OAUTH_STATE_COOKIE);
  store.delete(OAUTH_VERIFIER_COOKIE);
  store.delete(OAUTH_NEXT_COOKIE);
  return { state, verifier, next };
}
