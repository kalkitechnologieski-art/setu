import type { MetadataRoute } from "next";

function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  if (process.env.DEPLOY_PRIME_URL) {
    return process.env.DEPLOY_PRIME_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveBaseUrl();
  const now = new Date();
  return [
    { url: `${base}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/login`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
