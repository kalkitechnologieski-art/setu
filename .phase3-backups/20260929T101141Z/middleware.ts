// middleware.ts — Next.js 15 entry point.
// On Next.js 16+, rename this file to proxy.ts and rename the export to
// `proxy`. The matcher config exports as `config` in both cases.
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Skip middleware for Next.js internals and static metadata.
  // This is a performance optimization — it does NOT affect the secrets
  // scanner, which operates on the compiled bundle regardless.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|txt|xml|webmanifest)$).*)",
  ],
};
