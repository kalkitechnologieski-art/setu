#!/usr/bin/env bash
# predeploy.sh — Setu Kalki deployment gate
set -Eeuo pipefail
IFS=$'\n\t'

REPO_DIR="/d/setu"
cd "$REPO_DIR"

R='\033[0m'; RED='\033[0;31m'; GRN='\033[0;32m'
YEL='\033[1;33m'; CYN='\033[0;36m'; BLD='\033[1m'

pass=0
fail=0

step() { printf "\n${BLD}${CYN}▸ %s${R}\n" "$*"; }
ok()   { printf "${GRN}  ok  %s${R}\n" "$*"; pass=$((pass+1)); }
err()  { printf "${RED}  ERR %s${R}\n" "$*" >&2; fail=$((fail+1)); }

step "Git status"
if git rev-parse --git-dir >/dev/null 2>&1; then
  if [ -z "$(git status --porcelain)" ]; then ok "working tree clean"
  else err "uncommitted changes present"; git status --short | head -10; fi
else err "not a git repository"; fi

step "Env file"
if [ -f ".env.local" ]; then
  ok ".env.local present"
  for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_PUBLIC_APP_URL; do
    if grep -qE "^${v}=[^_]" .env.local 2>/dev/null; then ok "$v set"
    else err "$v missing or placeholder"; fi
  done
else err ".env.local missing"; fi

step "Migrations"
if [ -d "supabase/migrations" ]; then
  count=$(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ')
  ok "$count migration file(s)"
else err "supabase/migrations missing"; fi

step "TypeScript"
if npx tsc --noEmit 2>&1 | tail -5; then ok "tsc clean"
else err "tsc errors"; fi

step "Lint"
if npm run lint 2>&1 | tail -5; then ok "lint clean"
else err "lint errors"; fi

step "Build"
if npm run build 2>&1 | tail -8; then ok "next build succeeded"
else err "build failed"; fi

step "Vercel"
if command -v vercel >/dev/null 2>&1; then
  ok "vercel CLI installed"
  if vercel whoami >/dev/null 2>&1; then ok "authenticated"
  else err "not authenticated — run: vercel login"; fi
else err "vercel CLI missing"; fi

step "vercel.json"
if [ -s vercel.json ]; then
  if node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" 2>/dev/null; then
    ok "valid JSON"
  else err "invalid JSON"; fi
else err "missing or empty"; fi

printf "\n${BLD}═══════════════════════════════════════════${R}\n"
if [ "$fail" -eq 0 ]; then
  printf "${GRN}${BLD}  READY TO DEPLOY${R}\n"
  printf "${GRN}  %d checks passed${R}\n" "$pass"
  printf "\n  Next: ${CYN}./phase4.sh deploy${R}\n"
else
  printf "${RED}${BLD}  NOT READY${R}\n"
  printf "${RED}  %d failed, %d passed${R}\n" "$fail" "$pass"
  exit 1
fi
printf "${BLD}═══════════════════════════════════════════${R}\n"
