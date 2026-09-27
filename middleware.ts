// middleware.ts — Next.js 15 entry point.
// On Next.js 16+, rename to proxy.ts and rename the export to `proxy`.
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip middleware for static assets, Next.js internals, and metadata.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|txt|xml|webmanifest)$).*)",
  ],
};
