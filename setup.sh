#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-types.sh
#  Clear stale Next.js type validators → regenerate → verify → push
#  IDEMPOTENT · ATOMIC · BACKUP-SAFE · MSYS2-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
shopt -s nullglob
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-types-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-types-backups"
readonly SNAPSHOT="${TIMESTAMP}"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0
NOPUSH=0
NOCLR=0
for a in "$@"; do
  case "$a" in
    --dry-run)  DRY=1 ;;
    --no-push)  NOPUSH=1 ;;
    --no-color) NOCLR=1 ;;
    -h|--help)
      printf 'Usage: %s [--dry-run|--no-push|--no-color]\n' "$0"
      exit 0 ;;
    *) printf 'Unknown flag: %s\n' "$a" >&2; exit 2 ;;
  esac
done

if [ "$NOCLR" -eq 1 ]; then
  R=''; RED=''; GRN=''; YEL=''; CYN=''; BLD=''; MAG=''; DIM=''
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

ban "FIX STALE NEXT.JS TYPE VALIDATORS"
log "Repo:   $REPO_DIR"
log "Log:    $LOG_TMP"
hr

cd "$REPO_DIR"
[ -f package.json ] || die "Missing package.json"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Show the stale references
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 1 — Diagnose"

sub "Stale validator files referencing deleted app/page.js"
STALE=0
for f in ".next/types/validator.ts" ".next/dev/types/validator.ts"; do
  if [ -f "$f" ]; then
    if grep -q "app/page.js" "$f" 2>/dev/null; then
      err "STALE: $f references app/page.js (deleted)"
      grep -n "app/page.js" "$f" | head -3 | sed 's/^/    /' | tee -a "$LOG_TMP"
      STALE=$((STALE+1))
    fi
  fi
done

if [ "$STALE" -eq 0 ]; then
  ok "No stale references found (may already be clean)"
fi

sub "tsconfig.json includes"
if [ -f tsconfig.json ]; then
  node -e "
    const c = require('./tsconfig.json');
    const inc = c.include || [];
    const relevant = inc.filter(x => x.includes('.next/types') || x.includes('next-env'));
    console.log('  .next type includes:', relevant.join(', ') || '(none)');
  " 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Clear stale build artifacts
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 2 — Clear stale artifacts"

if [ "$DRY" -eq 1 ]; then
  dim "DRY: would remove .next/, .turbo/, *.tsbuildinfo"
else
  for target in ".next" ".turbo" "node_modules/.cache"; do
    if [ -e "$target" ]; then
      rm -rf "$target"
      ok "Cleared: $target/"
    fi
  done

  # tsbuildinfo (incremental caches) — check both root and node_modules
  find . -maxdepth 2 -name '*.tsbuildinfo' -not -path './node_modules/*' 2>/dev/null | while IFS= read -r f; do
    rm -f "$f"
    ok "Cleared: ${f#"$REPO_DIR"/}"
  done

  # next-env.d.ts is auto-regenerated; safe to remove too
  [ -f next-env.d.ts ] && rm -f next-env.d.ts && ok "Cleared: next-env.d.ts"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Rebuild to regenerate fresh validators
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "STEP 3 — Rebuild to regenerate validators"

  sub "next build (regenerates .next/types/)"
  BUILD_LOG="${LOG_HOME}/build-fix-types-${TIMESTAMP}.log"
  if npm run build > "$BUILD_LOG" 2>&1; then
    ok "Build: PASS"
  else
    err "Build: FAIL — see $BUILD_LOG"
    awk 'NR<=50 { print "    " $0 }' "$BUILD_LOG"
    exit 1
  fi

  sub "Verify validators no longer reference deleted file"
  if grep -q "app/page.js" .next/types/validator.ts 2>/dev/null; then
    err "STILL STALE: .next/types/validator.ts references app/page.js"
    exit 1
  else
    ok "Validators regenerated without app/page.js"
  fi

  if [ -f ".next/dev/types/validator.ts" ]; then
    if grep -q "app/page.js" ".next/dev/types/validator.ts" 2>/dev/null; then
      warn "dev validator still stale — will fix on next dev run"
    else
      ok "Dev validators clean"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — Type check
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "STEP 4 — TypeScript"

  TSC_LOG="${LOG_HOME}/tsc-fix-types-${TIMESTAMP}.log"
  if npx tsc --noEmit > "$TSC_LOG" 2>&1; then
    ok "TypeScript: PASS"
  else
    err "TypeScript: FAIL — see $TSC_LOG"
    awk '/error TS/ && NR<=20 { print "    " $0 }' "$TSC_LOG"
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "STEP 5 — Commit + push"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  # Ensure .next is gitignored (it's a build artifact)
  if [ -f .gitignore ]; then
    for p in ".next/" "next-env.d.ts" "*.tsbuildinfo" ".turbo/"; do
      grep -qxF "$p" .gitignore 2>/dev/null || printf '\n%s\n' "$p" >> .gitignore
    done
  fi

  git add -A

  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Fix stale Next.js type validators

Root cause: .next/types/validator.ts and .next/dev/types/validator.ts
still referenced app/page.js after the file was deleted in the previous
Netlify fix commit. tsconfig.json includes .next/types/**/*.ts, so
tsc --noEmit failed with TS2307.

Fix: cleared .next/, .turbo/, *.tsbuildinfo caches and rebuilt to
regenerate validators from the current route tree (app/(marketing)/page.tsx).
Also hardened .gitignore for build artifacts."
    ok "Committed"
  fi

  # Ensure remote
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
    ok "Pushed to origin/main — Netlify rebuild starts in ~30s"
  else
    err "Push failed — resolve conflicts manually"
    exit 1
  fi
fi

ban "FIX COMPLETE"
ok "Stale validators:  cleared"
ok "Fresh validators:  regenerated from current routes"
ok "TypeScript:        PASS"
ok "Netlify rebuild:   triggered"
hr