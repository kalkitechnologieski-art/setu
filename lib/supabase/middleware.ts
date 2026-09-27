// lib/supabase/middleware.ts
// ───────────────────────────────────────────────────────────────────────────
// Session refresh + route protection.
//
// Middleware is the ONLY place that writes auth cookies — Server Components
// cannot. It runs before every matched request and refreshes the session
// if the access token has expired. Without this, users are silently signed
// out after 1 hour.
//
// Public paths (manifest, robots, static assets) bypass auth entirely so
// unauthenticated requests to /manifest.webmanifest etc. never 401.
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
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml|json)$/i.test(pathname);
}

function isPublicMetadata(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    isStaticAsset(pathname)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || key === "__SET_ME__") {
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

  // Refresh the session on every request. Uses getUser() not getSession():
  // getUser() verifies the JWT signature, getSession() does not.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Static assets + metadata — never auth-protected.
  if (isPublicMetadata(path)) {
    return response;
  }

  // Already-signed-in user visiting an auth page → send to dashboard.
  if (user && AUTH_PAGES.has(path)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  // Unauthenticated user visiting a protected route → login.
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
