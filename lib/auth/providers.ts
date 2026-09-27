// lib/auth/providers.ts
// ═══════════════════════════════════════════════════════════════════════════
// Platform OAuth provider registry.
//
// One entry per platform. All config lives here — no magic strings scattered
// across route handlers.
//
// Google flow specifics (verified against Google's docs):
//   - access_type=offline + prompt=consent REQUIRED to receive a refresh token
//   - refresh_token expires in 7 days if OAuth app publishing status is
//     "Testing" — user must publish the app to receive long-lived tokens
//   - prompt=consent forces a new refresh token even on repeat authorization
//
// Meta flow specifics (verified against Meta's docs):
//   - NO refresh_token grant — short-lived tokens exchanged server-side for
//     long-lived user tokens (~60 days), which must be RE-ISSUED before expiry
//   - System User tokens (Business Manager) do not expire
//   - Scopes must pass Meta App Review for production; before review only
//     Admin/Developer/Tester users can authorize
//
// YouTube flow specifics (verified against Google's docs):
//   - youtube.readonly + youtube.force-ssl cover read + write
//   - Never combine bare `youtube` scope with others — it throws an error
// ═══════════════════════════════════════════════════════════════════════════

export type ProviderKey = "google_ads" | "youtube" | "meta_ads";

export interface ProviderConfig {
  key: ProviderKey;
  name: string;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
  /** Credentials from env. */
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Google-specific params that force a refresh token. */
  extraAuthParams: Record<string, string>;
  /** How often a token refresh is attempted (ms). Google: 50min, Meta: 24h. */
  refreshIntervalMs: number;
  /** Does the provider issue a refresh_token? Meta does not. */
  hasRefreshToken: boolean;
}

export const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  google_ads: {
    key: "google_ads",
    name: "Google Ads",
    description:
      "Campaign performance, keyword data, and budget reallocation across Google Ads accounts.",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    clientIdEnv: "GOOGLE_ADS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ADS_CLIENT_SECRET",
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    refreshIntervalMs: 50 * 60 * 1000,
    hasRefreshToken: true,
  },
  youtube: {
    key: "youtube",
    name: "YouTube",
    description:
      "Channel analytics, video performance, and audience insights for your channel.",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ],
    clientIdEnv: "GOOGLE_ADS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ADS_CLIENT_SECRET",
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    refreshIntervalMs: 50 * 60 * 1000,
    hasRefreshToken: true,
  },
  meta_ads: {
    key: "meta_ads",
    name: "Meta Business",
    description:
      "Facebook and Instagram ads, pages, and audiences across your Business Manager.",
    authorizeUrl: "https://www.facebook.com/v22.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v22.0/oauth/access_token",
    scopes: [
      "ads_read",
      "ads_management",
      "business_management",
      "pages_read_engagement",
      "pages_show_list",
    ],
    clientIdEnv: "META_ADS_CLIENT_ID",
    clientSecretEnv: "META_ADS_CLIENT_SECRET",
    extraAuthParams: {},
    refreshIntervalMs: 24 * 60 * 60 * 1000,
    hasRefreshToken: false,
  },
};

export function isProviderKey(v: string): v is ProviderKey {
  return v === "google_ads" || v === "youtube" || v === "meta_ads";
}

export function getProviderCredentials(key: ProviderKey): {
  clientId: string;
  clientSecret: string;
} | null {
  const cfg = PROVIDERS[key];
  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) return null;
  if (clientId === "__SET_ME__" || clientSecret === "__SET_ME__") return null;
  return { clientId, clientSecret };
}
