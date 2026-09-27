import type { MetadataRoute } from "next";

/**
 * Resolve the site origin at request time. In production, NEXT_PUBLIC_APP_URL
 * is the canonical Netlify URL. In dev or preview environments without that
 * env var, fall back to the current deployment's own origin — never a
 * hardcoded third-party domain.
 */
function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }
  // Netlify injects URL at build time
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  if (process.env.DEPLOY_PRIME_URL) {
    return process.env.DEPLOY_PRIME_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const base = resolveBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
          "/performance", "/signals", "/calls", "/analytics", "/workflows",
          "/approvals", "/settings", "/ops", "/connect",
          "/api/", "/callback", "/onboarding", "/verify",
          "/forgot-password", "/reset-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
