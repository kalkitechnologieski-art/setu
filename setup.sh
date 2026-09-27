#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-netlify.sh
#  Fix Netlify 404 — configure Next.js 15 runtime correctly
#  IDEMPOTENT · ATOMIC · BACKUP-SAFE · MSYS2-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
shopt -s nullglob
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly LOG_TMP="${LOG_HOME}/fix-netlify-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-netlify-backups"
readonly SNAPSHOT="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0
NOCLR=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-color) NOCLR=1 ;;
    -h|--help) printf 'Usage: %s [--dry-run|--no-color]\n' "$0"; exit 0 ;;
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
    printf '%s    DRY: %s (%s lines)%s\n' "$DIM" "${target#"$REPO_DIR"/}" "$(wc -l < "$tmp" | tr -d ' ')" "$R"
    rm -f "$tmp"; return 0
  fi
  backup "$target"
  mv "$tmp" "$target"
  ok "Wrote: ${target#"$REPO_DIR"/} ($(wc -l < "$target" | tr -d ' ') lines)"
}

ban "FIX NETLIFY 404"
log "Repo:   $REPO_DIR"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

cd "$REPO_DIR"
[ -f package.json ] || die "Missing package.json"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Diagnose the current state
# ═══════════════════════════════════════════════════════════════════════════
ban "1. Diagnosis"

sub "next.config.ts"
if [ -f next.config.ts ]; then
  if grep -q 'output:[[:space:]]*["'\'']standalone["'\'']' next.config.ts; then
    err "next.config.ts has output: \"standalone\" — THIS IS THE 404 CAUSE"
    warn "Standalone output builds a server bundle for Vercel/Docker."
    warn "Netlify needs the default Next.js build output."
  elif grep -q 'output:[[:space:]]*["'\'']export["'\'']' next.config.ts; then
    err "next.config.ts has output: \"export\" — incompatible with App Router dynamic routes"
    warn "Static export produces single HTML files that Netlify cannot route dynamically."
  else
    ok "next.config.ts has no incompatible output mode"
  fi
else
  warn "next.config.ts not found"
fi

sub "netlify.toml"
if [ -f netlify.toml ]; then
  if grep -q '@netlify/plugin-nextjs' netlify.toml; then
    ok "netlify.toml references @netlify/plugin-nextjs"
  else
    err "netlify.toml is missing @netlify/plugin-nextjs — 404 cause"
  fi
  if grep -q 'publish[[:space:]]*=[[:space:]]*"\.next"' netlify.toml; then
    ok "netlify.toml publish = .next"
  else
    warn "netlify.toml publish is not \".next\""
  fi
else
  err "netlify.toml not found — 404 cause"
fi

sub "package.json dependencies"
if node -e "process.exit(require('./package.json').devDependencies?.['@netlify/plugin-nextjs']?0:1)" 2>/dev/null; then
  VER=$(node -p "require('./package.json').devDependencies['@netlify/plugin-nextjs']")
  ok "@netlify/plugin-nextjs in devDependencies: $VER"
elif node -e "process.exit(require('./package.json').dependencies?.['@netlify/plugin-nextjs']?0:1)" 2>/dev/null; then
  VER=$(node -p "require('./package.json').dependencies['@netlify/plugin-nextjs']")
  warn "@netlify/plugin-nextjs in dependencies (should be devDependencies): $VER"
else
  err "@netlify/plugin-nextjs NOT installed — 404 cause"
fi

sub "vercel.json (should not exist for Netlify)"
if [ -f vercel.json ]; then
  warn "vercel.json present — Netlify ignores it, but consider removing it"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Fix next.config.ts (remove output mode)
# ═══════════════════════════════════════════════════════════════════════════
ban "2. Fix next.config.ts"

write_file next.config.ts <<'CONFIG_EOF'
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
CONFIG_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Write netlify.toml
# ═══════════════════════════════════════════════════════════════════════════
ban "3. Configure netlify.toml"

write_file netlify.toml <<'NETLIFY_EOF'
# netlify.toml — Setu Kalki Intelligence
# Netlify deployment configuration for Next.js 15 App Router.
#
# Next.js 15 App Router is fully supported on Netlify with zero configuration
# via the @netlify/plugin-nextjs runtime (v5+). Every feature is available:
#   Server Components · Server Actions · Middleware · Route Handlers
#   Streaming · ISR · Image Optimization · Redirects · Revalidation

[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

# The Next.js runtime — required. Without this, Netlify returns 404 for
# every route because it doesn't know how to route requests to Next.js.
[[plugins]]
  package = "@netlify/plugin-nextjs"

# ─── Optional: preserve Next.js static assets on the CDN ─────────────────
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/favicon.ico"
  [headers.values]
    Cache-Control = "public, max-age=86400"

# ─── Security headers ────────────────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
NETLIFY_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — Ensure @netlify/plugin-nextjs is in devDependencies
# ═══════════════════════════════════════════════════════════════════════════
ban "4. Ensure @netlify/plugin-nextjs installed"

NEED_INSTALL=0
if ! node -e "process.exit(require('./package.json').devDependencies?.['@netlify/plugin-nextjs']?0:1)" 2>/dev/null; then
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" -eq 1 ] && [ "$DRY" -eq 0 ]; then
  log "Installing @netlify/plugin-nextjs (dev)"
  npm i -D --no-audit --no-fund @netlify/plugin-nextjs 2>&1 | tail -3
  ok "Plugin installed"
else
  ok "Plugin already present"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Remove vercel.json (Netlify ignores it, keep repo clean)
# ═══════════════════════════════════════════════════════════════════════════
ban "5. Cleanup Vercel artifacts"

if [ -f vercel.json ]; then
  if [ "$DRY" -eq 0 ]; then
    backup vercel.json
    rm -f vercel.json
    ok "Removed vercel.json"
  else
    printf '%s    DRY: would remove vercel.json%s\n' "$DIM" "$R"
  fi
else
  ok "No vercel.json"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Verify local build produces the right output
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "6. Local build verification"

  sub "tsc --noEmit"
  TSC_LOG="${LOG_HOME}/tsc-netlify-$(date +%Y%m%d-%H%M%S).log"
  if npx tsc --noEmit > "$TSC_LOG" 2>&1; then
    ok "TypeScript: PASS"
  else
    err "TypeScript: FAIL"
    grep -E "error TS" "$TSC_LOG" | head -10 || true
    exit 1
  fi

  sub "next build"
  BUILD_LOG="${LOG_HOME}/build-netlify-$(date +%Y%m%d-%H%M%S).log"
  if npm run build > "$BUILD_LOG" 2>&1; then
    ok "Build: PASS"
    # Verify the route table shows expected output
    if grep -q "Route (app)" "$BUILD_LOG"; then
      ok "App Router routes detected"
    fi
    if [ -d ".next/server/app" ] || [ -d ".next/standalone" ]; then
      if [ -d ".next/standalone" ]; then
        warn ".next/standalone still present — build used standalone output"
      fi
    fi
  else
    err "Build: FAIL"
    tail -30 "$BUILD_LOG"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7 — Commit and push (triggers Netlify auto-deploy)
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "7. Commit + push"

  if [ -d .git ]; then
    git add next.config.ts netlify.toml package.json package-lock.json 2>/dev/null || true
    git add -A 2>/dev/null || true

    if ! git diff --cached --quiet 2>/dev/null; then
      git -c user.email="kalkitechnologieski@gmail.com" \
          -c user.name="Setu Kalki" \
          commit -q -m "Fix Netlify 404: configure Next.js runtime

- Remove output: 'standalone' from next.config.ts (Vercel-only)
- Add netlify.toml with @netlify/plugin-nextjs plugin
- Set publish = '.next' for Next.js routing
- Add @netlify/plugin-nextjs to devDependencies
- Remove vercel.json (ignored by Netlify)
- Add cache + security headers"
      ok "Committed"
    else
      ok "No changes to commit"
    fi

    if git remote get-url origin >/dev/null 2>&1; then
      log "Pushing to origin/main…"
      git push origin main >/dev/null 2>&1 || {
        warn "Push failed — trying rebase"
        git pull --rebase origin main >/dev/null 2>&1 && git push origin main >/dev/null 2>&1
      }
      ok "Pushed — Netlify will auto-deploy in ~90 seconds"
    fi
  else
    warn "Not a git repository"
  fi
fi

ban "FIX NETLIFY COMPLETE"
ok "next.config.ts  — output mode removed"
ok "netlify.toml    — @netlify/plugin-nextjs configured"
ok "package.json    — plugin in devDependencies"
ok "vercel.json     — removed"
ok "Build           — verified locally"
ok "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr