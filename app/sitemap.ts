import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL &&
  process.env.NEXT_PUBLIC_APP_URL !== "__SET_ME__"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://setu-kalki.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/login`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
