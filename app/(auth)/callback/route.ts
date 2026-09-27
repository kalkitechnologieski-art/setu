// app/(auth)/callback/route.ts
// ───────────────────────────────────────────────────────────────────────────
// Handles three flows:
//
//   1. OAuth (Google, GitHub)
//      Provider → Supabase → this route (with ?code=...)
//      We exchange the code for a session.
//
//   2. Email confirmation links
//      Supabase sends ?code=... via emailRedirectTo.
//      Same exchange.
//
//   3. Password reset links
//      Supabase appends ?code=... with type=recovery.
//      Redirect to /reset-password after exchange.
//
// The redirect uses x-forwarded-host on Netlify so deploy previews work
// without redeploying.
// ───────────────────────────────────────────────────────────────────────────
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const type = url.searchParams.get("type") ?? "signup";
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const origin = resolveOrigin(request);

  // Provider-side error.
  if (errorParam) {
    const back = new URL("/login", origin);
    back.searchParams.set("error", errorDescription ?? errorParam);
    return NextResponse.redirect(back);
  }

  if (!code) {
    const back = new URL("/login", origin);
    back.searchParams.set("error", "Missing authorization code");
    return NextResponse.redirect(back);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const back = new URL("/login", origin);
    back.searchParams.set("error", error.message);
    return NextResponse.redirect(back);
  }

  // Password recovery → send the user to the reset form.
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
  }

  // Email confirmation → onboarding if the user has no profile yet, else next.
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, origin));
}
