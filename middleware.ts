// middleware.ts — Next.js 15 entry point.
// On Next.js 16+, rename to proxy.ts and rename the export to `proxy`.
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /**
   * Skip middleware for static assets, Next.js internals, and metadata.
   * This eliminates the 401 on /manifest.webmanifest, /favicon.ico,
   * /robots.txt, and /sitemap.xml by never running middleware for them.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|txt|xml|webmanifest)$).*)",
  ],
};
