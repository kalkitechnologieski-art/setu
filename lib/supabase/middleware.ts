// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PROTECTED_PREFIXES = [
  "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
  "/performance", "/signals", "/calls", "/analytics", "/workflows",
  "/approvals", "/settings", "/connect",
];

const AUTH_ONLY_PATHS = ["/login", "/signup", "/magic-link", "/forgot-password"];

/**
 * Refresh the auth session on every request.
 *
 * This is the ONLY job of the middleware. It:
 *   1. Calls supabase.auth.getUser() — which triggers a token refresh if
 *      the access token has expired. Without this, sessions silently expire
 *      after 1 hour and users get signed out mid-task.
 *   2. Writes the refreshed cookies back to the request (for Server
 *      Components) and to the response (for the browser).
 *   3. Redirects unauthenticated users away from protected routes.
 *   4. Redirects authenticated users away from login/signup.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If keys are missing, pass through unchanged (dev with placeholders).
  if (!url || !key || key === "__SET_ME__") {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to request cookies so Server Components see the fresh token
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Rebuild response with updated request
        response = NextResponse.next({ request });
        // Write to response cookies so the browser stores them
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

  // CRITICAL: getUser() verifies the JWT and refreshes if expired.
  // Never use getSession() on the server — it does not verify the signature.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => path.startsWith(p));

  // Authenticated user trying to access login/signup → redirect to dashboard
  if (user && isAuthOnly) {
    const url2 = request.nextUrl.clone();
    url2.pathname = "/dashboard";
    url2.search = "";
    return NextResponse.redirect(url2);
  }

  // Unauthenticated user trying to access protected route → login
  if (!user && isProtected) {
    const url2 = request.nextUrl.clone();
    url2.pathname = "/login";
    url2.searchParams.set("next", path);
    return NextResponse.redirect(url2);
  }

  return response;
}
