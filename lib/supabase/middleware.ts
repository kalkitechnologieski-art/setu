// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Routes that require an authenticated session.
 */
const PROTECTED_PREFIXES = [
  "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
  "/performance", "/signals", "/calls", "/analytics", "/workflows",
  "/approvals", "/settings", "/connect", "/ops",
];

/**
 * Routes that must never require auth — static assets, auth pages, and
 * metadata files. Without these, the browser's manifest fetch, sitemap
 * crawler, and favicon request all fail with 401 because middleware
 * intercepts them before Next.js can serve the response.
 *
 * This is the PWA manifest fix documented in the Next.js middleware
 * pattern — PUBLIC_PATHS still applies CSP headers, but skips the auth
 * redirect.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/callback",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/icon.svg",
  "/icon.png",
  "/apple-icon.png",
  "/apple-icon.svg",
  "/opengraph-image",
  "/twitter-image",
]);

const AUTH_ONLY_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Match any path whose last segment is a static file extension
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml)$/i.test(pathname);
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

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Never redirect static assets or metadata files.
  if (isPublicPath(path)) {
    // If already signed in and hitting an auth-only page, redirect to dashboard
    if (user && AUTH_ONLY_PATHS.has(path)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/dashboard";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
