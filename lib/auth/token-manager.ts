// lib/auth/token-manager.ts
// ═══════════════════════════════════════════════════════════════════════════
// Read and refresh platform tokens.
//
// All reads go through the `read_platform_secret` RPC — tokens never appear
// in raw SELECT results, so a leaked query log cannot leak credentials.
//
// Refresh behavior per provider:
//   Google (Ads, YouTube): exchange refresh_token for a new access_token
//     every ~50 min. Refresh tokens last until revoked, UNLESS the app is in
//     "Testing" publishing status (then 7 days).
//   Meta: no refresh_token grant. Long-lived user tokens (~60 days) are
//     re-issued via the same OAuth dialog. We mark the connection `expired`
//     at T-7 days so the UI can prompt re-auth.
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from "@/lib/supabase/server";
import { PROVIDERS, type ProviderKey, getProviderCredentials } from "./providers";

export interface TokenBundle {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

export class TokenError extends Error {
  constructor(
    public readonly code:
      | "NO_CONNECTION"
      | "NOT_CONFIGURED"
      | "REVOKED"
      | "REFRESH_FAILED"
      | "UNKNOWN",
    message: string
  ) {
    super(message);
    this.name = "TokenError";
  }
}

// ─── Read a valid access token, refreshing if needed ──────────────────────

export async function getValidToken(
  connectionId: string,
  provider: ProviderKey
): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new TokenError("NOT_CONFIGURED", "Not authenticated");

  const { data: conn, error } = await supabase
    .from("platform_connections")
    .select("id, status, expires_at, refresh_token_secret_id")
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .single();

  if (error || !conn) {
    throw new TokenError("NO_CONNECTION", "Connection not found");
  }
  if (conn.status === "revoked") {
    throw new TokenError("REVOKED", "Connection revoked by user");
  }

  const expiresAt = conn.expires_at ? new Date(conn.expires_at) : null;
  const needsRefresh =
    !expiresAt ||
    expiresAt.getTime() < Date.now() + 5 * 60 * 1000; // 5-min safety margin

  if (needsRefresh && PROVIDERS[provider].hasRefreshToken && conn.refresh_token_secret_id) {
    await refreshConnection(connectionId, provider);
  }

  const { data, error: readErr } = await supabase.rpc("read_platform_secret", {
    p_connection_id: connectionId,
    p_kind: "access",
  });

  if (readErr || !data) {
    throw new TokenError("NO_CONNECTION", "Access token unavailable");
  }
  return data;
}

// ─── Refresh a connection ─────────────────────────────────────────────────

export async function refreshConnection(
  connectionId: string,
  provider: ProviderKey
): Promise<void> {
  const cfg = PROVIDERS[provider];
  const creds = getProviderCredentials(provider);
  if (!creds) {
    throw new TokenError("NOT_CONFIGURED", `Missing credentials for ${provider}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new TokenError("NOT_CONFIGURED", "Not authenticated");

  // Read the current refresh token
  const { data: refreshToken } = await supabase.rpc("read_platform_secret", {
    p_connection_id: connectionId,
    p_kind: "refresh",
  });
  if (!refreshToken) {
    throw new TokenError("REFRESH_FAILED", "No refresh token stored");
  }

  // Exchange
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // invalid_grant means the refresh token is permanently revoked. Stop
    // retrying — mark the connection and let the user re-authorize.
    if (body.includes("invalid_grant")) {
      await supabase
        .from("platform_connections")
        .update({
          status: "revoked",
          last_refresh_error: "Refresh token permanently revoked by provider",
        })
        .eq("id", connectionId);
      throw new TokenError("REVOKED", "Refresh token revoked");
    }
    await supabase
      .from("platform_connections")
      .update({
        status: "error",
        last_refresh_error: `${res.status}: ${body.slice(0, 200)}`,
      })
      .eq("id", connectionId);
    throw new TokenError("REFRESH_FAILED", `Token refresh failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  // Store new access token
  await supabase.rpc("store_platform_secret", {
    p_connection_id: connectionId,
    p_kind: "access",
    p_value: json.access_token,
    p_name: `platform_${connectionId}_access_${Date.now()}`,
  });

  // Store rotated refresh token if the provider returned one
  if (json.refresh_token) {
    await supabase.rpc("store_platform_secret", {
      p_connection_id: connectionId,
      p_kind: "refresh",
      p_value: json.refresh_token,
      p_name: `platform_${connectionId}_refresh_${Date.now()}`,
    });
  }

  // Update metadata
  const newExpiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from("platform_connections")
    .update({
      status: "active",
      last_refresh_at: new Date().toISOString(),
      last_refresh_error: null,
      expires_at: newExpiresAt,
    })
    .eq("id", connectionId);
}

// ─── Admin refresh (used by /api/cron/refresh-tokens) ─────────────────────
// Uses the service-role client. Takes userId explicitly because auth.uid()
// is null under the service role.

import { createAdminClient } from "@/lib/supabase/admin";

export async function refreshConnectionAdmin(
  connectionId: string,
  provider: ProviderKey,
  userId: string
): Promise<void> {
  const cfg = PROVIDERS[provider];
  const creds = getProviderCredentials(provider);
  if (!creds) {
    throw new TokenError("NOT_CONFIGURED", `Missing credentials for ${provider}`);
  }
  if (!cfg.hasRefreshToken) {
    // Meta — long-lived tokens must be re-issued by the user, not refreshed
    // server-side. Mark the connection `expired` so the UI prompts re-auth.
    const admin = createAdminClient();
    await admin
      .from("platform_connections")
      .update({ status: "expired" })
      .eq("id", connectionId);
    return;
  }

  const admin = createAdminClient();

  const { data: refreshToken } = await admin.rpc("admin_read_platform_secret", {
    p_connection_id: connectionId,
    p_kind: "refresh",
    p_user_id: userId,
  });
  if (!refreshToken) {
    throw new TokenError("REFRESH_FAILED", "No refresh token stored");
  }

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (body.includes("invalid_grant")) {
      await admin
        .from("platform_connections")
        .update({
          status: "revoked",
          last_refresh_error: "Refresh token permanently revoked by provider",
        })
        .eq("id", connectionId);
      throw new TokenError("REVOKED", "Refresh token revoked");
    }
    await admin
      .from("platform_connections")
      .update({
        status: "error",
        last_refresh_error: `${res.status}: ${body.slice(0, 200)}`,
      })
      .eq("id", connectionId);
    throw new TokenError("REFRESH_FAILED", `Refresh failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  await admin.rpc("admin_store_platform_secret", {
    p_connection_id: connectionId,
    p_kind: "access",
    p_value: json.access_token,
    p_name: `platform_${connectionId}_access_${Date.now()}`,
    p_user_id: userId,
  });

  if (json.refresh_token) {
    await admin.rpc("admin_store_platform_secret", {
      p_connection_id: connectionId,
      p_kind: "refresh",
      p_value: json.refresh_token,
      p_name: `platform_${connectionId}_refresh_${Date.now()}`,
      p_user_id: userId,
    });
  }

  const newExpiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  await admin
    .from("platform_connections")
    .update({
      status: "active",
      last_refresh_at: new Date().toISOString(),
      last_refresh_error: null,
      expires_at: newExpiresAt,
    })
    .eq("id", connectionId);
}
