// app/api/oauth/[provider]/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDERS,
  isProviderKey,
  getProviderCredentials,
  type ProviderKey,
} from "@/lib/auth/providers";
import { consumeOAuthCookies, safeEqual } from "@/lib/auth/pkce";
import { toJson } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface ProviderProfile {
  accountId: string;
  accountName: string;
  metadata: Record<string, unknown>;
}

/**
 * OAuth callback for platform connections.
 *
 * 1. Verifies the `state` cookie matches the query param (CSRF defense).
 * 2. Exchanges the authorization code + verifier for tokens.
 * 3. Identifies the connected account (customer ID / channel ID / ad account).
 * 4. Stores tokens as Vault secrets via RPC.
 * 5. Creates or updates the `platform_connections` row.
 * 6. Redirects to `next` with a status query param.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  const errorRedirect = (code: string, message: string) => {
    const url = new URL("/connect", request.url);
    url.searchParams.set("error", code);
    url.searchParams.set("message", message.slice(0, 200));
    return NextResponse.redirect(url);
  };

  if (!isProviderKey(provider)) {
    return errorRedirect("unknown_provider", "Provider not recognized");
  }

  const cfg = PROVIDERS[provider];
  const creds = getProviderCredentials(provider);
  if (!creds) {
    return errorRedirect("not_configured", "Platform not configured on server");
  }

  const searchParams = request.nextUrl.searchParams;
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (providerError) {
    return errorRedirect(
      providerError,
      providerErrorDescription ?? "Provider rejected the authorization"
    );
  }
  if (!code || !state) {
    return errorRedirect("missing_code", "Missing authorization code or state");
  }

  // Verify state matches the cookie
  const stored = await consumeOAuthCookies();
  if (!stored.state || !safeEqual(stored.state, state)) {
    return errorRedirect("csrf_mismatch", "State mismatch — please try again");
  }

  // Must be signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorRedirect("unauthorized", "Session expired — please sign in again");
  }

  // Exchange code for tokens
  const redirectUri = new URL(
    `/api/oauth/${provider}/callback`,
    request.url
  ).toString();

  let tokenResponse: TokenResponse;
  try {
    const res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: stored.verifier ?? "",
      }),
    });
    tokenResponse = (await res.json()) as TokenResponse;
    if (!res.ok || !tokenResponse.access_token) {
      return errorRedirect(
        "token_exchange_failed",
        tokenResponse.error_description ?? tokenResponse.error ?? "No access_token"
      );
    }
  } catch (e) {
    return errorRedirect(
      "network_error",
      e instanceof Error ? e.message : "Token exchange failed"
    );
  }

  // Identify the connected account (best effort — falls back to "unknown")
  let profile: ProviderProfile;
  try {
    profile = await identifyAccount(
      provider,
      tokenResponse.access_token
    );
  } catch {
    profile = {
      accountId: "unknown",
      accountName: "Connected account",
      metadata: {},
    };
  }

  // Upsert the connection row
  const expiresAt = tokenResponse.expires_in
    ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    : null;

  const scopeArray = (tokenResponse.scope ?? cfg.scopes.join(" "))
    .split(" ")
    .filter(Boolean);

  const { data: conn, error: upsertErr } = await supabase
    .from("platform_connections")
    .upsert(
      {
        user_id: user.id,
        provider,
        provider_account_id: profile.accountId,
        provider_account_name: profile.accountName,
        scopes: scopeArray,
        token_type: tokenResponse.token_type ?? "Bearer",
        expires_at: expiresAt,
        status: "active",
        last_refresh_at: new Date().toISOString(),
        last_refresh_error: null,
        metadata: toJson(profile.metadata),
      },
      { onConflict: "user_id,provider,provider_account_id" }
    )
    .select("id")
    .single();

  if (upsertErr || !conn) {
    return errorRedirect("db_error", upsertErr?.message ?? "Could not save connection");
  }

  // Store tokens as Vault secrets
  await supabase.rpc("store_platform_secret", {
    p_connection_id: conn.id,
    p_kind: "access",
    p_value: tokenResponse.access_token,
    p_name: `platform_${conn.id}_access_${Date.now()}`,
  });

  if (tokenResponse.refresh_token) {
    await supabase.rpc("store_platform_secret", {
      p_connection_id: conn.id,
      p_kind: "refresh",
      p_value: tokenResponse.refresh_token,
      p_name: `platform_${conn.id}_refresh_${Date.now()}`,
    });
  }

  // Audit log
  await supabase.from("auth_events").insert({
    user_id: user.id,
    event_type: "platform_connected",
    provider,
    metadata: toJson({
        connection_id: conn.id,
        account: profile.accountId,
      }),
  });

  // Success — go to `next` with a success flag
  const url = new URL(stored.next ?? "/connect", request.url);
  url.searchParams.set("connected", provider);
  return NextResponse.redirect(url);
}

// ─── Account identification ───────────────────────────────────────────────

async function identifyAccount(
  provider: ProviderKey,
  accessToken: string
): Promise<ProviderProfile> {
  switch (provider) {
    case "google_ads":
    case "youtube":
      return identifyGoogle(provider, accessToken);
    case "meta_ads":
      return identifyMeta(accessToken);
  }
}

async function identifyGoogle(
  provider: "google_ads" | "youtube",
  accessToken: string
): Promise<ProviderProfile> {
  // Google OAuth tokeninfo returns the account email
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
  );
  const json = (await res.json()) as { email?: string; sub?: string };
  return {
    accountId: json.sub ?? json.email ?? "google-account",
    accountName: json.email ?? "Google account",
    metadata: { email: json.email, provider },
  };
}

async function identifyMeta(accessToken: string): Promise<ProviderProfile> {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${accessToken}`
  );
  const json = (await res.json()) as { id?: string; name?: string };
  return {
    accountId: json.id ?? "meta-account",
    accountName: json.name ?? "Meta account",
    metadata: { id: json.id, name: json.name },
  };
}
