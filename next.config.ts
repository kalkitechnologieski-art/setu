import type { NextConfig } from "next";

/**
 * Netlify deploys this project via the OpenNext adapter
 * (@netlify/plugin-nextjs v5+), which wraps Next.js 15 App Router's native
 * build output.
 *
 * DO NOT set:
 *   output: "standalone"  — this builds a Vercel/Docker server bundle.
 *                          Netlify publishes static assets from .next/;
 *                          it never runs server.js. Result: 404 on every
 *                          route including /.
 *
 *   output: "export"      — static HTML only. Incompatible with App Router
 *                          dynamic routes, middleware, and Server Actions.
 *
 * The runtime adapter handles all routing, SSR, ISR, middleware, and image
 * optimization automatically from the default .next/ output.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Server Actions body limit — matches our upload constraints.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Skew protection — Netlify reads this via env, but declaring intent here
  // makes the config self-documenting.
  // (Enable in Netlify: NETLIFY_NEXT_SKEW_PROTECTION=true)
};

export default nextConfig;
