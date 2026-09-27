// app/api/oauth/[provider]/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDERS,
  isProviderKey,
  getProviderCredentials,
} from "@/lib/auth/providers";
import {
  generateState,
  generateCodeVerifier,
  deriveCodeChallenge,
  setOAuthCookies,
} from "@/lib/auth/pkce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Begin a platform OAuth flow.
 *
 * 1. Verifies the user is signed in (this is a protected action).
 * 2. Generates state + PKCE verifier, stores them in httpOnly cookies.
 * 3. Redirects to the provider's authorize URL.
 *
 * The `next` query param controls where the user lands after the callback.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!isProviderKey(provider)) {
    return NextResponse.json(
      { error: "Unknown provider" },
      { status: 400 }
    );
  }

  const cfg = PROVIDERS[provider];
  const creds = getProviderCredentials(provider);
  if (!creds) {
    return NextResponse.json(
      {
        error: "not_configured",
        message: `Missing ${cfg.clientIdEnv} or ${cfg.clientSecretEnv}`,
      },
      { status: 503 }
    );
  }

  // Must be signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `/connect`);
    return NextResponse.redirect(loginUrl);
  }

  // Build PKCE material
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = deriveCodeChallenge(verifier);

  const next = request.nextUrl.searchParams.get("next") ?? "/connect";
  await setOAuthCookies(state, verifier, next);

  // Build the authorize URL
  const redirectUri = new URL(
    `/api/oauth/${provider}/callback`,
    request.url
  ).toString();

  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  // Provider-specific extra params (e.g. Google's access_type=offline)
  for (const [k, v] of Object.entries(cfg.extraAuthParams)) {
    url.searchParams.set(k, v);
  }

  return NextResponse.redirect(url.toString());
}
