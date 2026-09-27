// lib/auth/urls.ts
// ───────────────────────────────────────────────────────────────────────────
// Canonical origin resolver. Works on localhost, Vercel previews, and
// Netlify deploy previews.
//
// Priority order:
//   1. NEXT_PUBLIC_APP_URL       — explicit override (production)
//   2. X-Forwarded-Host header   — set by Netlify/Vercel proxies
//   3. Host header               — plain Node host
//   4. localhost fallback        — dev only
//
// Netlify sets x-forwarded-host on every request through their proxy.
// Reading it means the same build works on the production domain and on
// every deploy preview without redeploying.
// ───────────────────────────────────────────────────────────────────────────
import { headers } from "next/headers";

export async function getOrigin(): Promise<string> {
  // Explicit override wins.
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }

  const h = await headers();

  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = h.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = h.get("host");
  if (host) {
    const proto = host.startsWith("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function callbackUrl(origin: string, next?: string): string {
  const url = new URL("/callback", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}
