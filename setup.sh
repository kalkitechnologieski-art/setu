#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-runtime.sh
#  Fix 401 manifest + React error #441 (next-themes hydration)
#  IDEMPOTENT · ATOMIC · BACKUP-SAFE · MSYS2-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
shopt -s nullglob
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly APP_DIR="${REPO_DIR}/app"
readonly LIB_DIR="${REPO_DIR}/lib"
readonly COMP_DIR="${REPO_DIR}/components"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-runtime-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-runtime-backups"
readonly SNAPSHOT="${TIMESTAMP}"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0; NOPUSH=0; NOCLR=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-push) NOPUSH=1 ;;
    --no-color) NOCLR=1 ;;
    -h|--help) printf 'Usage: %s [--dry-run|--no-push|--no-color]\n' "$0"; exit 0 ;;
    *) printf 'Unknown flag: %s\n' "$a" >&2; exit 2 ;;
  esac
done

if [ "$NOCLR" -eq 1 ]; then
  R='' RED='' GRN='' YEL='' CYN='' BLD='' MAG='' DIM=''
else
  R=$'\033[0m'; RED=$'\033[0;31m'; GRN=$'\033[0;32m'
  YEL=$'\033[1;33m'; CYN=$'\033[0;36m'; BLD=$'\033[1m'
  MAG=$'\033[0;35m'; DIM=$'\033[2m'
fi

_ts()  { date +'%H:%M:%S'; }
log()  { printf '%s[%s]%s %s\n' "$CYN" "$(_ts)" "$R" "$*" | tee -a "$LOG_TMP"; }
ok()   { printf '%s✔%s %s\n' "$GRN" "$R" "$*" | tee -a "$LOG_TMP"; }
warn() { printf '%s⚠%s %s\n' "$YEL" "$R" "$*" | tee -a "$LOG_TMP"; }
err()  { printf '%s✘%s %s\n' "$RED" "$R" "$*" >&2; }
die()  { err "$*"; exit 1; }
ban()  { printf '\n%s%s═══ %s ═══%s\n' "$BLD" "$CYN" "$*" "$R" | tee -a "$LOG_TMP"; }
sub()  { printf '\n%s%s─── %s ───%s\n' "$BLD" "$MAG" "$*" "$R" | tee -a "$LOG_TMP"; }
hr()   { printf '%s──────────────────────────────────────────%s\n' "$CYN" "$R"; }
dim()  { printf '%s    %s%s\n' "$DIM" "$*" "$R"; }

on_err() { local c=$?; err "Failure at line ${1:-?} (exit $c)"; err "Log: $LOG_TMP"; exit "$c"; }
trap 'on_err $LINENO' ERR

backup() {
  local f="$1"
  [ -f "$f" ] || return 0
  local rel="${f#"$REPO_DIR"/}"
  local bd="${BACKUP_ROOT}/${SNAPSHOT}/${rel}"
  mkdir -p "$(dirname "$bd")"
  cp -f "$f" "$bd"
}

write_file() {
  local target="$1"
  local tmp="${target}.tmp.$$"
  mkdir -p "$(dirname "$target")"
  cat > "$tmp"

  if [ -f "$target" ] && cmp -s "$tmp" "$target"; then
    rm -f "$tmp"
    ok "SKIP (unchanged): ${target#"$REPO_DIR"/}"
    return 0
  fi

  if [ "$DRY" -eq 1 ]; then
    dim "DRY: ${target#"$REPO_DIR"/} ($(wc -l < "$tmp" | tr -d ' ') lines)"
    rm -f "$tmp"; return 0
  fi

  backup "$target"
  mv "$tmp" "$target"
  ok "Wrote: ${target#"$REPO_DIR"/} ($(wc -l < "$target" | tr -d ' ') lines)"
}

ban "FIX RUNTIME — 401 MANIFEST + REACT ERROR #441"
log "Repo:   $REPO_DIR"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

cd "$REPO_DIR"
[ -f package.json ] || die "Missing package.json"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Diagnose
# ═══════════════════════════════════════════════════════════════════════════
ban "1. Diagnosis"

sub "next-themes in package.json"
if node -e "const p=require('./package.json');process.exit((p.dependencies&&p.dependencies['next-themes'])||(p.devDependencies&&p.devDependencies['next-themes'])?0:1)" 2>/dev/null; then
  VER=$(node -p "(require('./package.json').dependencies||{})['next-themes']||(require('./package.json').devDependencies||{})['next-themes']")
  warn "next-themes installed: $VER — known React 19 hydration source"
else
  ok "next-themes not installed"
fi

sub "next-themes imports"
if grep -rln "from \"next-themes\"" --include="*.ts" --include="*.tsx" "$APP_DIR" "$COMP_DIR" "$LIB_DIR" 2>/dev/null | head -10 | grep -q .; then
  grep -rln "from \"next-themes\"" --include="*.ts" --include="*.tsx" "$APP_DIR" "$COMP_DIR" "$LIB_DIR" 2>/dev/null | while read -r f; do
    warn "  imports next-themes: ${f#"$REPO_DIR"/}"
  done
else
  ok "No next-themes imports found"
fi

sub "Middleware public paths"
if [ -f lib/supabase/middleware.ts ]; then
  if grep -q "manifest.webmanifest" lib/supabase/middleware.ts; then
    ok "Middleware already excludes manifest"
  else
    err "Middleware does NOT exclude /manifest.webmanifest — 401 source"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Fix middleware (public paths for static assets)
# ═══════════════════════════════════════════════════════════════════════════
ban "2. Fix middleware — public paths"

write_file "${LIB_DIR}/supabase/middleware.ts" <<'MW_EOF'
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Routes that require an authenticated session.
 */
const PROTECTED_PREFIXES = [
  "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
  "/performance", "/signals", "/calls", "/analytics", "/workflows",
  "/approvals", "/settings", "/connect", "/ops",
];

/**
 * Routes that must never require auth — static assets, auth pages, and
 * metadata files. Without these, the browser's manifest fetch, sitemap
 * crawler, and favicon request all fail with 401 because middleware
 * intercepts them before Next.js can serve the response.
 *
 * This is the PWA manifest fix documented in the Next.js middleware
 * pattern — PUBLIC_PATHS still applies CSP headers, but skips the auth
 * redirect.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/callback",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/icon.svg",
  "/icon.png",
  "/apple-icon.png",
  "/apple-icon.svg",
  "/opengraph-image",
  "/twitter-image",
]);

const AUTH_ONLY_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Match any path whose last segment is a static file extension
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml)$/i.test(pathname);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || key === "__SET_ME__") {
    return response;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          })
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Never redirect static assets or metadata files.
  if (isPublicPath(path)) {
    // If already signed in and hitting an auth-only page, redirect to dashboard
    if (user && AUTH_ONLY_PATHS.has(path)) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/dashboard";
      redirect.search = "";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return response;
}
MW_EOF

write_file "${REPO_DIR}/middleware.ts" <<'MWROOT_EOF'
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
MWROOT_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Replace next-themes with useSyncExternalStore theme system
# ═══════════════════════════════════════════════════════════════════════════
ban "3. Replace next-themes with custom theme system"

mkdir -p "${LIB_DIR}/theme"

write_file "${LIB_DIR}/theme/store.ts" <<'THEME_STORE_EOF'
"use client";

/**
 * Theme store — useSyncExternalStore-compatible.
 *
 * Replaces next-themes, which renders an inline <script> inside a component.
 * React 19 rejects script tags rendered as component children during
 * hydration (React error #441). This store applies the theme class via
 * useEffect instead — no inline script, no hydration mismatch.
 *
 * SSR safety:
 *   getServerTheme()       returns "system"  — stable for server render
 *   getServerResolved()    returns "light"   — stable for server render
 *   First client render    uses server snapshot (matches HTML)
 *   After hydration        React re-reads getSnapshot() and updates
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type Listener = () => void;

const STORAGE_KEY = "setu-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

class ThemeStore {
  private theme: Theme = "system";
  private resolved: ResolvedTheme = "light";
  private listeners = new Set<Listener>();
  private mediaQuery: MediaQueryList | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        this.theme = stored;
      }
    } catch {
      /* localStorage unavailable */
    }

    this.mediaQuery = window.matchMedia(MEDIA_QUERY);
    try {
      this.mediaQuery.addEventListener("change", this.handleMediaChange);
    } catch {
      /* older browsers */
    }
    this.applyTheme();
  }

  private handleMediaChange = (): void => {
    if (this.theme === "system") this.applyTheme();
  };

  private applyTheme(): void {
    if (typeof document === "undefined") return;
    const systemDark = this.mediaQuery?.matches ?? false;
    const next: ResolvedTheme =
      this.theme === "system" ? (systemDark ? "dark" : "light") : this.theme;
    if (next === this.resolved) return;
    this.resolved = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Theme => this.theme;
  getResolvedSnapshot = (): ResolvedTheme => this.resolved;
  getServerSnapshot = (): Theme => "system";
  getServerResolvedSnapshot = (): ResolvedTheme => "light";

  setTheme = (theme: Theme): void => {
    this.theme = theme;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* localStorage unavailable */
      }
    }
    this.applyTheme();
  };

  toggle = (): void => {
    this.setTheme(this.resolved === "dark" ? "light" : "dark");
  };
}

let singleton: ThemeStore | null = null;

export function getThemeStore(): ThemeStore {
  if (!singleton) singleton = new ThemeStore();
  return singleton;
}

export type { ThemeStore };
THEME_STORE_EOF

write_file "${LIB_DIR}/theme/use-theme.ts" <<'THEME_HOOK_EOF'
"use client";

import { useSyncExternalStore } from "react";
import { getThemeStore, type ResolvedTheme, type Theme } from "./store";

export interface UseThemeResult {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): UseThemeResult {
  const store = getThemeStore();

  const theme = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const resolvedTheme = useSyncExternalStore(
    store.subscribe,
    store.getResolvedSnapshot,
    store.getServerResolvedSnapshot
  );

  return {
    theme,
    resolvedTheme,
    setTheme: store.setTheme,
  };
}
THEME_HOOK_EOF

write_file "${COMP_DIR}/theme-provider.tsx" <<'THEME_PROVIDER_EOF'
"use client";

import { useEffect } from "react";
import { getThemeStore } from "@/lib/theme/store";

/**
 * Initializes the theme store on mount.
 *
 * No inline <script> is rendered — that pattern breaks React 19 hydration
 * (React error #441). The store applies the theme class via useEffect
 * after the first client paint.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getThemeStore().init();
  }, []);

  return <>{children}</>;
}
THEME_PROVIDER_EOF

write_file "${COMP_DIR}/theme-toggle.tsx" <<'THEME_TOGGLE_EOF'
"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeStore } from "@/lib/theme/store";

export function ThemeToggle() {
  const store = getThemeStore();

  const resolved = useSyncExternalStore(
    store.subscribe,
    store.getResolvedSnapshot,
    store.getServerResolvedSnapshot
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => store.toggle()}
      suppressHydrationWarning
    >
      {resolved === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
THEME_TOGGLE_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — Update root layout (remove next-themes import)
# ═══════════════════════════════════════════════════════════════════════════
ban "4. Root layout"

write_file "${APP_DIR}/layout.tsx" <<'ROOT_LAYOUT_EOF'
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL &&
  process.env.NEXT_PUBLIC_APP_URL !== "__SET_ME__"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://setu-kalki.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Setu Kalki — AI workforce for revenue teams",
    template: "%s · Setu Kalki",
  },
  description:
    "Four autonomous AI employees — lead discovery, voice outreach, nurture sequences, and performance marketing — operating in parallel from one control plane.",
  applicationName: "Setu Kalki",
  keywords: [
    "AI marketing",
    "AI sales development",
    "AI SDR",
    "performance marketing automation",
    "voice AI",
    "lead generation",
  ],
  openGraph: {
    type: "website",
    siteName: "Setu Kalki",
    title: "Setu Kalki — AI workforce for revenue teams",
    description:
      "Four autonomous AI employees running your revenue motions in parallel.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Setu Kalki — AI workforce for revenue teams",
    description:
      "Four autonomous AI employees running your revenue motions in parallel.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={inter.variable}
      style={{ colorScheme: "light" }}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
ROOT_LAYOUT_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Update shadcn sonner (it imports next-themes by default)
# ═══════════════════════════════════════════════════════════════════════════
ban "5. Sonner component"

SONNER="${COMP_DIR}/ui/sonner.tsx"
if [ -f "$SONNER" ]; then
  if grep -q 'next-themes' "$SONNER" 2>/dev/null; then
    write_file "$SONNER" <<'SONNER_EOF'
"use client";

import { useTheme } from "@/lib/theme/use-theme";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
SONNER_EOF
  else
    ok "Sonner already uses custom theme hook"
  fi
else
  warn "components/ui/sonner.tsx not found"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Guard Recharts against SSR hydration mismatch
# ═══════════════════════════════════════════════════════════════════════════
ban "6. Recharts SSR guard"

write_file "${COMP_DIR}/dashboard/analytics-chart.tsx" <<'CHART_EOF'
"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalyticsPoint {
  date: string;
  leads: number;
  conversions: number;
}

const noopSubscribe = (): (() => void) => () => {};
const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export function AnalyticsChart({ data }: { data: AnalyticsPoint[] }) {
  // Recharts' ResponsiveContainer cannot measure the DOM during SSR — it
  // renders with width=-1, height=-1 and produces a hydration mismatch when
  // the client measures the real dimensions. Rendering a stable placeholder
  // on the server (and during the first client render) prevents the mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Pipeline Momentum</CardTitle>
          <p className="text-xs text-muted-foreground">Last 14 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Leads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Conversions
          </span>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[280px]">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#gradLeads)"
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradConv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Loading chart…
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
CHART_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7 — Uninstall next-themes
# ═══════════════════════════════════════════════════════════════════════════
ban "7. Uninstall next-themes"

if node -e "const p=require('./package.json');process.exit((p.dependencies&&p.dependencies['next-themes'])||(p.devDependencies&&p.devDependencies['next-themes'])?0:1)" 2>/dev/null; then
  if [ "$DRY" -eq 1 ]; then
    dim "DRY: would run npm uninstall next-themes"
  else
    npm uninstall next-themes 2>&1 | tail -3
    ok "next-themes removed"
  fi
else
  ok "next-themes not installed"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8 — Verify no lingering next-themes imports
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "8. Verify"

  LEFTOVER=$(grep -rln "from \"next-themes\"" --include="*.ts" --include="*.tsx" \
    "$APP_DIR" "$COMP_DIR" "$LIB_DIR" 2>/dev/null || true)
  if [ -n "$LEFTOVER" ]; then
    err "next-themes still imported in:"
    printf '%s\n' "$LEFTOVER" | while read -r f; do err "  ${f#"$REPO_DIR"/}"; done
    exit 1
  fi
  ok "No next-themes imports remain"

  sub "tsc --noEmit"
  TSC_LOG="${LOG_HOME}/tsc-runtime-${TIMESTAMP}.log"
  if npx tsc --noEmit > "$TSC_LOG" 2>&1; then
    ok "TypeScript: PASS"
  else
    err "TypeScript: FAIL"
    awk '/error TS/ && NR<=20 { print "    " $0 }' "$TSC_LOG"
    exit 1
  fi

  sub "next build"
  BUILD_LOG="${LOG_HOME}/build-runtime-${TIMESTAMP}.log"
  if npm run build > "$BUILD_LOG" 2>&1; then
    ok "Build: PASS"
    awk '/^(Route|├|└|○|ƒ)/ && n<50 { print "  " $0; n++ }' "$BUILD_LOG" || true
  else
    err "Build: FAIL"
    awk 'NR<=50 { print "    " $0 }' "$BUILD_LOG"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 9 — Commit + push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "9. Commit + push"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  git add -A

  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Fix Netlify runtime: 401 manifest + React error #441

Bug 1 — /manifest.webmanifest returned 401:
  Middleware matcher regex matched the manifest path, so unauthenticated
  requests were redirected to /login. The browser cannot follow redirects
  for manifest fetches, so it surfaced as a 401.

  Fix: added PUBLIC_PATHS set to lib/supabase/middleware.ts covering
  manifest.webmanifest, robots.txt, sitemap.xml, favicon.ico, and every
  static asset extension. Also tightened middleware.ts matcher to skip
  these paths entirely so middleware never runs for them.

Bug 2 — React error #441 during hydration:
  next-themes renders an inline <script> inside a component. React 19
  rejects script tags rendered as component children during hydration
  (this is the documented cause of error #441 in React 19).

  Fix: replaced next-themes with a useSyncExternalStore-based theme system:
    • lib/theme/store.ts       — module-level store, localStorage + matchMedia
    • lib/theme/use-theme.ts   — React hook, SSR-safe snapshots
    • components/theme-provider.tsx — initializes store in useEffect
    • components/theme-toggle.tsx   — reads resolved theme via useSyncExternalStore
    • components/ui/sonner.tsx      — uses custom useTheme hook

Bug 3 — Recharts ResponsiveContainer SSR mismatch:
  ResponsiveContainer measures the DOM on mount. During SSR it renders
  with width=-1, height=-1 and produces a hydration mismatch.

  Fix: AnalyticsChart now renders a stable placeholder when not mounted
  (detected via useSyncExternalStore), swapping to the chart after hydration.

Also updated app/layout.tsx to remove next-themes imports and use the
custom ThemeProvider. Uninstalled next-themes from package.json."
    ok "Committed"
  fi

  if git remote get-url origin >/dev/null 2>&1; then
    existing=$(git remote get-url origin)
    [ "$existing" = "$GIT_REMOTE" ] || git remote set-url origin "$GIT_REMOTE"
  else
    git remote add origin "$GIT_REMOTE"
  fi

  log "Pushing to origin/main…"
  PUSH_OK=1
  git push origin main >/dev/null 2>&1 || PUSH_OK=0

  if [ "$PUSH_OK" -eq 0 ]; then
    warn "Push rejected — attempting rebase"
    if git pull --rebase origin main >/dev/null 2>&1; then
      git push origin main >/dev/null 2>&1 && PUSH_OK=1
    fi
  fi

  if [ "$PUSH_OK" -eq 1 ]; then
    ok "Pushed to origin/main — Netlify rebuild ~90s"
  else
    err "Push failed — resolve conflicts manually"
    exit 1
  fi
fi

ban "RUNTIME FIX COMPLETE"
ok "Manifest 401:   PUBLIC_PATHS + matcher exclusion"
ok "React #441:     next-themes removed, custom store in place"
ok "Recharts SSR:   mount guard prevents hydration mismatch"
ok "next-themes:    uninstalled from package.json"
[ "$DRY" -eq 0 ] && ok "TypeScript:    PASS"
[ "$DRY" -eq 0 ] && ok "Build:         PASS"
[ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ] && ok "Pushed:        origin/main"
ok "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
ok "Log:    $LOG_TMP"
hr