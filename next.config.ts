import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ───────────────────────────────────────────────────────────────────────
  // Netlify deploy: do NOT set `output: "standalone"` or `output: "export"`.
  //
  //   `standalone` builds a server bundle for Vercel/Docker containers.
  //                Netlify sees no index.html and returns 404 for every path.
  //
  //   `export`     produces static HTML only — incompatible with App Router
  //                dynamic routes, middleware, and Server Actions.
  //
  // The @netlify/plugin-nextjs runtime handles the build automatically.
  // ───────────────────────────────────────────────────────────────────────
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
