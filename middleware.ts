// middleware.ts — Next.js 15 entry point for session refresh.
// On Next.js 16+, rename to proxy.ts and rename the export to `proxy`.
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every route except:
     *   - _next/static, _next/image (build assets)
     *   - favicon.ico, .svg, .png, .jpg, .jpeg, .gif, .webp (images)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
