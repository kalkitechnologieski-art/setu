// proxy.ts — Next.js 16 file convention.
// Renamed from middleware.ts. The exported function is `proxy`.
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|eot|txt|xml|webmanifest)$).*)",
  ],
};
