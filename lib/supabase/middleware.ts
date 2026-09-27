// lib/supabase/middleware.ts
// ───────────────────────────────────────────────────────────────────────────
// Session refresh + route protection for Next.js 15 App Router.
//
// ─── WHY THIS FILE TRIGGERS NETLIFY'S SECRETS SCANNER ──────────────────────
// This middleware reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_
// PUBLISHABLE_KEY. Next.js INLINES every NEXT_PUBLIC_* variable at build
// time — the literal values end up in .netlify/edge-functions/**.
//
// Netlify's secrets scanner flags any env var value in build output and
// cannot distinguish public-by-design vars from real secrets. The fix is
// in netlify.toml:
//
//   SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,\
//                             NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,\
//                             NEXT_PUBLIC_APP_URL"
//
// These three values are already shipped to every browser that loads the
// app — the publishable (anon) key is designed to be public. Data security
// comes from Row Level Security policies, not from hiding this key.
//
// Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, etc.) lack
// the NEXT_PUBLIC_ prefix, are never inlined, and remain subject to the
// scanner.
// ───────────────────────────────────────────────────────────────────────────
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PROTECTED_PREFIXES = [
  "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
  "/performance", "/signals", "/calls", "/analytics", "/workflows",
  "/approvals", "/settings", "/connect", "/ops",
];

const AUTH_PAGES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/onboarding",
]);

function isStaticAsset(pathname: string): boolean {
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml|json)$/i.test(
    pathname
  );
}

function isPublicMetadata(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname === "/diagnostics" ||
    isStaticAsset(pathname)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase is not configured, pass through with no auth checks.
  // Pages still render; actions will return a friendly error.
  if (!url || !key || url === "__SET_ME__" || key === "__SET_ME__") {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          })
        );
      },
    },
  });

  // getUser() verifies the JWT signature (getSession() does not).
  // If this throws, we log and pass through rather than crashing the
  // entire page render.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (e) {
    console.error("[middleware] getUser failed:", e);
    return response;
  }

  const path = request.nextUrl.pathname;

  // Never auth-protect static assets or metadata.
  if (isPublicMetadata(path)) {
    return response;
  }

  // Already-signed-in user on an auth page → dashboard.
  if (user && AUTH_PAGES.has(path)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  // Unauthenticated user on a protected route → login.
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
