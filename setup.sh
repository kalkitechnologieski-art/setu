#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-netlify-secrets.sh
#  Fix Netlify build failure: secrets scanner flags public NEXT_PUBLIC_* vars
#  IDEMPOTENT · ATOMIC · BACKUP-SAFE · MSYS2-SAFE · HEREDOC-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
shopt -s nullglob
shopt -s globstar 2>/dev/null || true
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly APP_DIR="${REPO_DIR}/app"
readonly LIB_DIR="${REPO_DIR}/lib"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-netlify-secrets-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-netlify-secrets-backups"
readonly SNAPSHOT="${TIMESTAMP}"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0; NOPUSH=0; NOCLR=0; SKIPVERIFY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-push) NOPUSH=1 ;;
    --no-color) NOCLR=1 ;;
    --skip-verify) SKIPVERIFY=1 ;;
    -h|--help)
      printf 'Usage: %s [--dry-run|--no-push|--no-color|--skip-verify]\n' "$0"
      exit 0 ;;
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
    rm -f "$tmp"; ok "SKIP (unchanged): ${target#"$REPO_DIR"/}"; return 0
  fi
  if [ "$DRY" -eq 1 ]; then
    dim "DRY: ${target#"$REPO_DIR"/} ($(wc -l < "$tmp" | tr -d ' ') lines)"
    rm -f "$tmp"; return 0
  fi
  backup "$target"
  mv "$tmp" "$target"
  ok "Wrote: ${target#"$REPO_DIR"/} ($(wc -l < "$target" | tr -d ' ') lines)"
}

ban "FIX NETLIFY SECRETS SCANNER"
log "Repo:   $REPO_DIR"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

cd "$REPO_DIR"
[ -f package.json ] || die "Missing package.json"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Diagnose
# ═══════════════════════════════════════════════════════════════════════════
ban "1. Diagnose"

sub "All env vars referenced in code"
ENV_VARS_USED=()
while IFS= read -r var; do
  [ -n "$var" ] || continue
  ENV_VARS_USED+=("$var")
done < <(
  grep -rohE "process\.env\.[A-Z_][A-Z0-9_]*" --include="*.ts" --include="*.tsx" \
    "$APP_DIR" "$LIB_DIR" 2>/dev/null \
    | sed 's/process\.env\.//' \
    | sort -u
)

if [ "${#ENV_VARS_USED[@]}" -eq 0 ]; then
  warn "No env vars found in code"
else
  log "Found ${#ENV_VARS_USED[@]} env vars referenced in code:"
  for v in "${ENV_VARS_USED[@]}"; do
    if [[ "$v" == NEXT_PUBLIC_* ]]; then
      dim "  $v (public — inlined at build, safe to expose)"
    else
      dim "  $v (secret — must not appear in output)"
    fi
  done
fi

sub "NEXT_PUBLIC_* vars in current build (if .next exists)"
if [ -d .next ]; then
  PUBLIC_FOUND=$(grep -rlE "NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" .next 2>/dev/null | head -3 || true)
  if [ -n "$PUBLIC_FOUND" ]; then
    log "NEXT_PUBLIC_* values are inlined in:"
    printf '%s\n' "$PUBLIC_FOUND" | while read -r f; do
      dim "  ${f}"
    done
  else
    ok "No NEXT_PUBLIC_* inlining found (clean build)"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Rewrite netlify.toml with SECRETS_SCAN_OMIT_KEYS
# ═══════════════════════════════════════════════════════════════════════════
ban "2. netlify.toml"

write_file "${REPO_DIR}/netlify.toml" <<'NETLIFY_EOF'
# ═══════════════════════════════════════════════════════════════════════════
# Setu Kalki Intelligence — Netlify configuration
# ═══════════════════════════════════════════════════════════════════════════
# Next.js 15 App Router is fully supported on Netlify via the OpenNext
# adapter (@netlify/plugin-nextjs v5+). Every feature is available:
#   Server Components · Server Actions · Middleware · Route Handlers
#   Streaming · ISR · Image Optimization · Revalidation
# ═══════════════════════════════════════════════════════════════════════════

[build]
  command = "npm run build"
  publish = ".next"

# ═══════════════════════════════════════════════════════════════════════════
# BUILD ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════
# SECRETS_SCAN_OMIT_KEYS
#   Next.js INLINES every NEXT_PUBLIC_* variable at build time. Those values
#   end up in client bundles and in edge function bundles — by design, since
#   NEXT_PUBLIC_* vars are meant to be shipped to browsers.
#
#   Netlify's secrets scanner runs after every build and flags ANY env var
#   value that appears in the output. It cannot distinguish public-by-design
#   vars from true secrets, so we must explicitly whitelist the public ones.
#
#   These three values ARE public by design:
#     NEXT_PUBLIC_SUPABASE_URL              — project URL, visible in browser
#     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — anon/publishable key (RLS-protected)
#     NEXT_PUBLIC_APP_URL                   — public site URL
#
#   Secrets like SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, RESEND_API_KEY, etc.
#   are NEVER inlined (they lack the NEXT_PUBLIC_ prefix), so they are still
#   scanned and blocked if they ever leak into the build output.
# ═══════════════════════════════════════════════════════════════════════════

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"
  NPM_FLAGS = "--legacy-peer-deps"
  SECRETS_SCAN_ENABLED = "true"
  SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL"

# ─── Next.js runtime ─────────────────────────────────────────────────────
[[plugins]]
  package = "@netlify/plugin-nextjs"

# ═══════════════════════════════════════════════════════════════════════════
# HEADERS
# ═══════════════════════════════════════════════════════════════════════════

# Immutable Next.js build assets — cache for a year.
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Next.js image optimizer output.
[[headers]]
  for = "/_next/image*"
  [headers.values]
    Cache-Control = "public, max-age=60, stale-while-revalidate=86400"

# Favicon — moderate cache.
[[headers]]
  for = "/favicon.ico"
  [headers.values]
    Cache-Control = "public, max-age=86400"

# API routes — never cache.
[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, max-age=0"

# PWA manifest — short cache, must be re-validated.
[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Cache-Control = "public, max-age=3600"
    Content-Type = "application/manifest+json"

# Global security headers.
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# ═══════════════════════════════════════════════════════════════════════════
# DEPLOY CONTEXTS
# ═══════════════════════════════════════════════════════════════════════════

[context.production]
  command = "npm run build"

[context.deploy-preview]
  command = "npm run build"

[context.branch-deploy]
  command = "npm run build"
NETLIFY_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Harden middleware (make it obvious why NEXT_PUBLIC_* is inlined)
# ═══════════════════════════════════════════════════════════════════════════
ban "3. Middleware"

write_file "${LIB_DIR}/supabase/middleware.ts" <<'MW_EOF'
// lib/supabase/middleware.ts
// ───────────────────────────────────────────────────────────────────────────
// Session refresh + route protection for Next.js 15 App Router.
//
// ─── WHY THIS FILE TRIGGERS NETLIFY'S SECRETS SCANNER ──────────────────────
// This middleware reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_
// PUBLISHABLE_KEY. Next.js INLINES every NEXT_PUBLIC_* variable at build
// time — the literal values end up in .netlify/edge-functions/**.
//
// Netlify's secrets scanner flags any env var value in build output and
// cannot distinguish public-by-design vars from real secrets. The fix is
// in netlify.toml:
//
//   SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,\
//                             NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,\
//                             NEXT_PUBLIC_APP_URL"
//
// These three values are already shipped to every browser that loads the
// app — the publishable (anon) key is designed to be public. Data security
// comes from Row Level Security policies, not from hiding this key.
//
// Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, etc.) lack
// the NEXT_PUBLIC_ prefix, are never inlined, and remain subject to the
// scanner.
// ───────────────────────────────────────────────────────────────────────────
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PROTECTED_PREFIXES = [
  "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
  "/performance", "/signals", "/calls", "/analytics", "/workflows",
  "/approvals", "/settings", "/connect", "/ops",
];

const AUTH_PAGES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/onboarding",
]);

function isStaticAsset(pathname: string): boolean {
  return /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml|json)$/i.test(
    pathname
  );
}

function isPublicMetadata(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname === "/diagnostics" ||
    isStaticAsset(pathname)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase is not configured, pass through with no auth checks.
  // Pages still render; actions will return a friendly error.
  if (!url || !key || url === "__SET_ME__" || key === "__SET_ME__") {
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

  // getUser() verifies the JWT signature (getSession() does not).
  // If this throws, we log and pass through rather than crashing the
  // entire page render.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (e) {
    console.error("[middleware] getUser failed:", e);
    return response;
  }

  const path = request.nextUrl.pathname;

  // Never auth-protect static assets or metadata.
  if (isPublicMetadata(path)) {
    return response;
  }

  // Already-signed-in user on an auth page → dashboard.
  if (user && AUTH_PAGES.has(path)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  // Unauthenticated user on a protected route → login.
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

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — Root middleware (unchanged matcher, cleaner comment)
# ═══════════════════════════════════════════════════════════════════════════
ban "4. Root middleware"

write_file "${REPO_DIR}/middleware.ts" <<'MWROOT_EOF'
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
MWROOT_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Update .env.example with the fix documentation
# ═══════════════════════════════════════════════════════════════════════════
ban "5. .env.example"

if [ -f "${REPO_DIR}/.env.example" ]; then
  ENV_EXAMPLE="${REPO_DIR}/.env.example"
  if ! grep -q "SECRETS_SCAN_OMIT_KEYS" "$ENV_EXAMPLE" 2>/dev/null; then
    if [ "$DRY" -eq 0 ]; then
      backup "$ENV_EXAMPLE"
      cat >> "$ENV_EXAMPLE" <<'ENV_APPEND'

# ═══════════════════════════════════════════════════════════════════════════
# Netlify — Secrets Scanner Configuration
# ═══════════════════════════════════════════════════════════════════════════
# Next.js inlines every NEXT_PUBLIC_* variable at build time. Netlify's
# scanner flags those values in build output because it cannot distinguish
# public-by-design vars from real secrets. This whitelist tells the scanner
# to skip the three public values while still scanning everything else.
#
# Configured in netlify.toml under [build.environment]. If you deploy via
# the Netlify UI, add the same variable to Site configuration →
# Build & deploy → Environment variables:
#
#   SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL"
#
# These values are safe to expose — the publishable key is designed to be
# shipped to browsers, and RLS policies enforce data access at the database.
ENV_APPEND
      ok "Appended SECRETS_SCAN_OMIT_KEYS docs to .env.example"
    fi
  else
    ok "SKIP (.env.example already documents SECRETS_SCAN_OMIT_KEYS)"
  fi
else
  warn ".env.example not found"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Add DEPLOY.md section explaining the fix
# ═══════════════════════════════════════════════════════════════════════════
ban "6. DEPLOY.md"

if [ -f "${REPO_DIR}/DEPLOY.md" ]; then
  DEPLOY_MD="${REPO_DIR}/DEPLOY.md"
  if ! grep -q "SECRETS_SCAN_OMIT_KEYS" "$DEPLOY_MD" 2>/dev/null; then
    if [ "$DRY" -eq 0 ]; then
      backup "$DEPLOY_MD"
      cat >> "$DEPLOY_MD" <<'DEPLOY_APPEND'

---

## Netlify Secrets Scanner

Netlify's build pipeline runs a secrets scanner after every build. It
searches the compiled output for the literal values of every environment
variable. If a value is found, the build fails:

    Secrets scanning found secrets in build.
    Secret env var "NEXT_PUBLIC_SUPABASE_URL"'s value detected:
      found value at line 110 in .netlify/edge-functions/...
      /___netlify-edge-handler-middleware/server/middleware.js

### Why this happens

Next.js **inlines every `NEXT_PUBLIC_*` variable** at build time. The
values end up inside client bundles and inside the middleware edge
function. That's by design — those variables are meant to be shipped to
browsers.

Netlify's scanner cannot distinguish public-by-design variables from true
secrets. It flags any env var value it finds in build output.

### The fix

`netlify.toml` includes a whitelist of the three public variables:

    [build.environment]
      SECRETS_SCAN_ENABLED = "true"
      SECRETS_SCAN_OMIT_KEYS = "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL"

The scanner still runs — it just ignores those specific keys. Real secrets
(SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, RESEND_API_KEY, AGENTCALL_API_KEY,
MARKIFACT_API_KEY, LANGSMITH_API_KEY, CRON_SECRET, GOOGLE_ADS_CLIENT_SECRET,
META_ADS_CLIENT_SECRET) do not have the NEXT_PUBLIC_ prefix, are never
inlined, and remain fully subject to the scanner.

### If you deploy via Netlify UI

The same variable can be set manually:

**Site configuration → Build & deploy → Environment variables:**

    SECRETS_SCAN_OMIT_KEYS = NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,NEXT_PUBLIC_APP_URL

Then trigger **Deploys → Trigger deploy → Clear cache and deploy site**.

### Other scanner controls

| Variable | Purpose |
|---|---|
| `SECRETS_SCAN_ENABLED` | Set to `"false"` to disable scanning entirely (not recommended) |
| `SECRETS_SCAN_OMIT_KEYS` | Comma-separated env var **names** to skip |
| `SECRETS_SCAN_OMIT_PATHS` | Glob patterns of file paths to skip |
| `SECRETS_SCAN_SMART_DETECTION_ENABLED` | Set to `"false"` to disable heuristic detection |

Use `SECRETS_SCAN_OMIT_KEYS` — never disable scanning globally.
DEPLOY_APPEND
      ok "Appended secrets scanner section to DEPLOY.md"
    fi
  else
    ok "SKIP (DEPLOY.md already documents SECRETS_SCAN_OMIT_KEYS)"
  fi
else
  warn "DEPLOY.md not found"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7 — Validate netlify.toml is parseable
# ═══════════════════════════════════════════════════════════════════════════
ban "7. Validate netlify.toml"

if [ "$DRY" -eq 0 ]; then
  NETLIFY_TOML="${REPO_DIR}/netlify.toml"

  sub "Required sections"
  for pattern in \
    '\[build\]' \
    'command = "npm run build"' \
    'publish = ".next"' \
    'SECRETS_SCAN_OMIT_KEYS' \
    'NEXT_PUBLIC_SUPABASE_URL' \
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' \
    'NEXT_PUBLIC_APP_URL' \
    '@netlify/plugin-nextjs'; do
    if grep -q "$pattern" "$NETLIFY_TOML" 2>/dev/null; then
      ok "  $pattern"
    else
      err "  MISSING: $pattern"
      exit 1
    fi
  done

  sub "Netlify secrets to keep scanning"
  for secret in SUPABASE_SERVICE_ROLE_KEY GROQ_API_KEY RESEND_API_KEY; do
    if grep -qE "SECRETS_SCAN_OMIT_KEYS.*${secret}" "$NETLIFY_TOML" 2>/dev/null; then
      err "  $secret is in the omit list — remove it, it is a real secret"
      exit 1
    fi
  done
  ok "Real secrets are NOT in the omit list"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 8 — Verify build locally
# ═══════════════════════════════════════════════════════════════════════════
if [ "$SKIPVERIFY" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "8. Verify"

  sub "tsc --noEmit"
  TSC_LOG="${LOG_HOME}/tsc-secrets-${TIMESTAMP}.log"
  if npx tsc --noEmit > "$TSC_LOG" 2>&1; then
    ok "TypeScript: PASS"
  else
    err "TypeScript: FAIL"
    awk '/error TS/ && NR<=30 { print "    " $0 }' "$TSC_LOG"
    exit 1
  fi

  sub "next build"
  BUILD_LOG="${LOG_HOME}/build-secrets-${TIMESTAMP}.log"
  if npm run build > "$BUILD_LOG" 2>&1; then
    ok "Build: PASS"

    sub "Sanity: NEXT_PUBLIC_* inlining (expected)"
    INLINED=$(grep -rl "NEXT_PUBLIC_SUPABASE_URL" .next 2>/dev/null | wc -l | tr -d ' ')
    log "  $INLINED file(s) in .next/ contain the NEXT_PUBLIC_* identifier"
    log "  (Expected — this is why SECRETS_SCAN_OMIT_KEYS is required)"
  else
    err "Build: FAIL"
    awk 'NR<=60 { print "    " $0 }' "$BUILD_LOG"
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

  current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'main')
  [ "$current" = "main" ] || git branch -M main

  git add -A

  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Fix Netlify secrets scanner blocking the build

Root cause:
  Next.js inlines every NEXT_PUBLIC_* variable at build time. The values
  of NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  appear in .netlify/edge-functions/**/middleware.js. Netlify's secrets
  scanner cannot distinguish public-by-design vars from real secrets and
  failed the build with exit code 2.

Fix:
  • netlify.toml — added SECRETS_SCAN_OMIT_KEYS with the three public vars
    (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL). Scanning remains enabled for real secrets like
    SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, RESEND_API_KEY.

  • lib/supabase/middleware.ts — comprehensive JSDoc explaining why the
    NEXT_PUBLIC_* inlining is intentional and why the whitelist exists.

  • .env.example — documented SECRETS_SCAN_OMIT_KEYS.

  • DEPLOY.md — new section on Netlify secrets scanner."

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

ban "NETLIFY SECRETS FIX COMPLETE"

ok "netlify.toml:     SECRETS_SCAN_OMIT_KEYS whitelist"
ok "Middleware:       documented NEXT_PUBLIC_* inlining"
ok ".env.example:     whitelist documented"
ok "DEPLOY.md:        secrets scanner section"
[ "$SKIPVERIFY" -eq 0 ] && ok "TypeScript:       PASS"
[ "$SKIPVERIFY" -eq 0 ] && ok "Build:            PASS"
[ "$NOPUSH" -eq 0 ] && ok "Pushed:           origin/main"

ok "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
ok "Log:    $LOG_TMP"

printf '\n%sWhat happens next:%s\n' "$BLD" "$R"
printf '  1. Netlify detects the push and rebuilds in ~90s\n'
printf '  2. The scanner runs — NEXT_PUBLIC_* values are ignored\n'
printf '  3. Real secrets (SERVICE_ROLE_KEY, GROQ_API_KEY) are still scanned\n'
printf '  4. Build succeeds → deploy publishes\n'
printf '\n%sVerify after deploy:%s\n' "$BLD" "$R"
printf '  curl -sI https://steady-croissant-9cbbbf.netlify.app/manifest.webmanifest | head -3\n'
printf '  curl -s  https://steady-croissant-9cbbbf.netlify.app/api/health | jq\n'
hr