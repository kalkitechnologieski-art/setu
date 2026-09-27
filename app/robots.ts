import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_APP_URL &&
  process.env.NEXT_PUBLIC_APP_URL !== "__SET_ME__"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://setu-kalki.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
          "/performance", "/signals", "/calls", "/analytics", "/workflows",
          "/approvals", "/settings", "/ops", "/connect",
          "/api/", "/callback", "/onboarding",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
