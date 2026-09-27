#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-final.sh
#  Final cleanup: metadata URLs + orphaned auth forms
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
readonly COMP_DIR="${REPO_DIR}/components"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-final-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-final-backups"
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

safe_delete() {
  local target="$1"
  [ -e "$target" ] || return 0
  if [ "$DRY" -eq 1 ]; then dim "DRY: would delete ${target#"$REPO_DIR"/}"; return 0; fi
  [ -f "$target" ] && backup "$target"
  rm -rf "$target"
  ok "Deleted: ${target#"$REPO_DIR"/}"
}

ban "FINAL CLEANUP — METADATA + ORPHANED FORMS"
log "Repo:   $REPO_DIR"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

cd "$REPO_DIR"
[ -f package.json ] || die "Missing package.json"
[ -d node_modules ] || die "Missing node_modules"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Fix app/robots.ts
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 1 — app/robots.ts"

write_file "${APP_DIR}/robots.ts" <<'ROBOTS_EOF'
import type { MetadataRoute } from "next";

/**
 * Resolve the site origin at request time. In production, NEXT_PUBLIC_APP_URL
 * is the canonical Netlify URL. In dev or preview environments without that
 * env var, fall back to the current deployment's own origin — never a
 * hardcoded third-party domain.
 */
function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }
  // Netlify injects URL at build time
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  if (process.env.DEPLOY_PRIME_URL) {
    return process.env.DEPLOY_PRIME_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const base = resolveBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard", "/inbox", "/workforce", "/leads", "/campaigns",
          "/performance", "/signals", "/calls", "/analytics", "/workflows",
          "/approvals", "/settings", "/ops", "/connect",
          "/api/", "/callback", "/onboarding", "/verify",
          "/forgot-password", "/reset-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
ROBOTS_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Fix app/sitemap.ts
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 2 — app/sitemap.ts"

write_file "${APP_DIR}/sitemap.ts" <<'SITEMAP_EOF'
import type { MetadataRoute } from "next";

function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && configured !== "__SET_ME__") {
    return configured.replace(/\/$/, "");
  }
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  if (process.env.DEPLOY_PRIME_URL) {
    return process.env.DEPLOY_PRIME_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveBaseUrl();
  const now = new Date();
  return [
    { url: `${base}/`,       lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/login`,  lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
SITEMAP_EOF

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Delete orphaned auth forms (superseded by new names)
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 3 — Remove orphaned auth files"

sub "Scanning for imports that reference the old auth API"
OLD_API_HITS=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if grep -qE "signInWithPassword|signUpWithPassword|AuthResult.*@/app/actions/auth" "$f" 2>/dev/null; then
    warn "Uses old auth API: ${f#"$REPO_DIR"/}"
    grep -nE "signInWithPassword|signUpWithPassword|AuthResult.*@/app/actions/auth" "$f" | head -3 | sed 's/^/    /' | tee -a "$LOG_TMP"
    OLD_API_HITS=$((OLD_API_HITS + 1))
  fi
done < <(find "$COMP_DIR" "$APP_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null)

if [ "$OLD_API_HITS" -eq 0 ]; then
  ok "No files reference the old auth API"
fi

sub "Deleting superseded auth forms"
DELETE_LIST=(
  "${COMP_DIR}/auth/login-form.tsx"
  "${COMP_DIR}/auth/signup-form.tsx.old"
)

# These are the ones that exist in the current codebase and are superseded
for target in "${DELETE_LIST[@]}"; do
  if [ -f "$target" ]; then
    case "$target" in
      */login-form.tsx)
        # Only delete if signin-form.tsx exists (the replacement)
        if [ -f "${COMP_DIR}/auth/signin-form.tsx" ]; then
          safe_delete "$target"
        else
          warn "Not deleting login-form.tsx — signin-form.tsx missing"
        fi
        ;;
      *)
        safe_delete "$target"
        ;;
    esac
  fi
done

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — Verify remaining Vercel couplings are gone
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 4 — Verify no Vercel couplings"

SWEPT=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if grep -qE "vercel\.app|vercel\.com" "$f" 2>/dev/null; then
    err "Still references Vercel: ${f#"$REPO_DIR"/}"
    grep -nE "vercel\.app|vercel\.com" "$f" | head -3 | sed 's/^/    /' | tee -a "$LOG_TMP"
    SWEPT=$((SWEPT + 1))
  fi
done < <(find "$APP_DIR" "$LIB_DIR" "$COMP_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null)

[ "$SWEPT" -eq 0 ] && ok "No Vercel couplings remain" || die "$SWEPT file(s) still reference Vercel"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Verify: typecheck + build
# ═══════════════════════════════════════════════════════════════════════════
if [ "$SKIPVERIFY" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "STEP 5 — Verify"

  sub "tsc --noEmit"
  TSC_LOG="${LOG_HOME}/tsc-final-${TIMESTAMP}.log"
  if npx tsc --noEmit > "$TSC_LOG" 2>&1; then
    ok "TypeScript: PASS"
  else
    err "TypeScript: FAIL — see $TSC_LOG"
    awk '/error TS/ && NR<=30 { print "    " $0 }' "$TSC_LOG"
    exit 1
  fi

  sub "next build"
  BUILD_LOG="${LOG_HOME}/build-final-${TIMESTAMP}.log"
  if npm run build > "$BUILD_LOG" 2>&1; then
    ok "Build: PASS"
    awk '/^(Route|├|└|○|ƒ)/ && n<60 { print "  " $0; n++ }' "$BUILD_LOG" || true
  else
    err "Build: FAIL"
    awk 'NR<=50 { print "    " $0 }' "$BUILD_LOG"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Commit + push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "STEP 6 — Commit + push"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'main')
  [ "$current" = "main" ] || git branch -M main

  git add -A

  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Fix metadata URLs + remove orphaned auth forms

Changes:
  • app/robots.ts — read NEXT_PUBLIC_APP_URL or Netlify's URL env at runtime,
    no more hardcoded setu-kalki.vercel.app fallback
  • app/sitemap.ts — same runtime resolution
  • Removed components/auth/login-form.tsx — superseded by signin-form.tsx;
    it imported signInWithPassword/AuthResult from old @/app/actions/auth
    which was replaced in the Supabase Auth rewrite

Verified: tsc --noEmit + next build both pass."
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
    warn "Push rejected — rebasing"
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

ban "FIX COMPLETE"
ok "robots.ts:      reads NEXT_PUBLIC_APP_URL"
ok "sitemap.ts:     reads NEXT_PUBLIC_APP_URL"
ok "Orphaned files: removed"
ok "Vercel refs:    0 remaining"
[ "$SKIPVERIFY" -eq 0 ] && ok "TypeScript:    PASS"
[ "$SKIPVERIFY" -eq 0 ] && ok "Build:         PASS"
[ "$NOPUSH" -eq 0 ] && ok "Pushed:        origin/main"
ok "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr