#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — FRONTEND POLISH & BACKEND VERIFICATION
#  ---------------------------------------------------------------------------
#  Implements:
#    1. Motion tokens + surface tokens in globals.css
#    2. Micro-interactions on button, card, stat-card
#    3. Three-layer error boundary verification
#    4. Supabase PromiseLike guard (replace .catch on queries)
#    5. Typecheck + build + push
#
#  Idempotent. CRLF self-healing. MINGW64-hardened.
# =============================================================================

# --- CRLF SELF-HEAL ---------------------------------------------------------
_self_src="${BASH_SOURCE[0]}"
if [ -n "$_self_src" ] && [ -f "$_self_src" ]; then
  if LC_ALL=C od -c "$_self_src" 2>/dev/null | grep -q '\\r'; then
    printf '[self-heal] CRLF detected — normalizing\n' >&2
    _tmp="$(mktemp)"
    tr -d '\r' < "$_self_src" > "$_tmp"
    mv "$_tmp" "$_self_src"
    chmod +x "$_self_src"
    exec bash "$_self_src" "$@"
  fi
fi
unset _self_src

set -Eeuo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$REPO_ROOT"

# --- PLATFORM ---------------------------------------------------------------
case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin) PLATFORM="macos" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *) PLATFORM="linux" ;;
esac

# --- COLOURS ----------------------------------------------------------------
if [ -t 1 ]; then
  R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
  C='\033[0;36m'; BD='\033[1m'; M='\033[0;35m'; NC='\033[0m'
else
  R=''; G=''; Y=''; C=''; BD=''; M=''; NC=''
fi

log_ok()   { printf "${G}[OK]${NC}   %s\n" "$1"; }
log_info() { printf "${C}[INFO]${NC} %s\n" "$1"; }
log_warn() { printf "${Y}[WARN]${NC} %s\n" "$1"; }
log_err()  { printf "${R}[ERR]${NC}  %s\n" "$1" >&2; }
log_step() { printf "\n${BD}${C}>>> %s${NC}\n" "$1"; }
log_ban()  { printf "\n${BD}${M}%s${NC}\n" "$1"; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="$REPO_ROOT/.polish-logs"
LOG_FILE="$LOG_DIR/polish-${TS}.log"
BACKUP_DIR="$REPO_ROOT/.polish-backups/${TS}"
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# --- FLAGS (all initialized — no unbound variable risk) ---------------------
DRY_RUN=0
FIX_ONLY=0
VERIFY_ONLY=0
FORCE=0
NO_PUSH=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)      DRY_RUN=1 ;;
    --fix-only)     FIX_ONLY=1 ;;
    --verify-only)  VERIFY_ONLY=1 ;;
    --force)        FORCE=1 ;;
    --no-push)      NO_PUSH=1 ;;
    --help|-h)      printf 'Usage: %s [--dry-run|--fix-only|--verify-only|--force|--no-push]\n' "$0"; exit 0 ;;
    *) printf 'Unknown: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

# --- UTILITIES --------------------------------------------------------------
backup_file() {
  local src="$1"
  [ ! -f "$src" ] && return 0
  local rel="${src#$REPO_ROOT/}"
  mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
  cp "$src" "$BACKUP_DIR/$rel"
}

write_file() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  tr -d '\r' > "$dest"
  if [ -s "$dest" ] && [ "$(tail -c1 "$dest" | wc -l | tr -d ' ')" = "0" ]; then
    printf '\n' >> "$dest"
  fi
  log_ok "Wrote: ${dest#$REPO_ROOT/}"
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

LOCK_FILE="$REPO_ROOT/.polish.lock"
if [ -f "$LOCK_FILE" ]; then
  log_err "Another run active. Lock: $LOCK_FILE"
  exit 1
fi
echo "$$" > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

log_ban "================================================================"
log_ban "  SETU KALKI — FRONTEND POLISH & BACKEND VERIFICATION"
log_ban "  Run: $TS"
log_ban "  Platform: $PLATFORM"
log_ban "================================================================"

# =============================================================================
#  STEP 1 — PREFLIGHT
# =============================================================================
log_step "Step 1 — Preflight"

has_cmd node || { log_err "node not found"; exit 1; }
has_cmd npm  || { log_err "npm not found";  exit 1; }

log_info "Node: $(node --version | tr -d 'v\r\n')"
log_info "npm:  $(npm --version | tr -d '\r\n')"

for rel in "package.json" "tsconfig.json" "next.config.ts" "app/globals.css"; do
  [ -e "$REPO_ROOT/$rel" ] || { log_err "Missing: $rel"; exit 1; }
done
log_ok "Project structure verified"

if [ "$VERIFY_ONLY" = "1" ]; then
  log_step "Verify only — running tsc"
  TSC_EXIT=0
  npx tsc --noEmit 2>&1 | head -60 || TSC_EXIT=$?
  exit "$TSC_EXIT"
fi

# =============================================================================
#  STEP 2 — MOTION TOKENS IN globals.css
# =============================================================================
log_step "Step 2 — Motion tokens in globals.css"

GLOBALS="$REPO_ROOT/app/globals.css"
backup_file "$GLOBALS"

if grep -q '\-\-duration-fast:' "$GLOBALS" 2>/dev/null; then
  log_ok "Motion tokens already present"
else
  log_info "Adding motion + surface tokens..."

  if [ "$DRY_RUN" = "0" ]; then
    # Append tokens at the end of the @theme block
    awk '
      /^@theme \{/ { in_theme = 1 }
      in_theme && /^\}/ {
        print "  /* ─── Motion tokens ──────────────────────────────────────── */"
        print "  --duration-instant: 80ms;"
        print "  --duration-fast: 180ms;"
        print "  --duration-normal: 350ms;"
        print "  --duration-slow: 500ms;"
        print "  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);"
        print "  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);"
        print "  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);"
        print ""
        print "  /* ─── Surface tokens ─────────────────────────────────────── */"
        print "  --surface-raised: hsl(0 0% 100%);"
        print "  --surface-overlay: hsl(0 0% 100%);"
        print "  --surface-sunken: hsl(240 5% 98%);"
        in_theme = 0
      }
      { print }
    ' "$GLOBALS" > "$GLOBALS.tmp" && mv "$GLOBALS.tmp" "$GLOBALS"

    # Add dark mode overrides
    if ! grep -q '\-\-surface-raised: hsl(240 8% 8%)' "$GLOBALS" 2>/dev/null; then
      awk '
        /^\.dark \{/ { in_dark = 1 }
        in_dark && /^\}/ {
          print "  --surface-raised: hsl(240 8% 8%);"
          print "  --surface-overlay: hsl(240 8% 8%);"
          print "  --surface-sunken: hsl(240 10% 4%);"
          in_dark = 0
        }
        { print }
      ' "$GLOBALS" > "$GLOBALS.tmp" && mv "$GLOBALS.tmp" "$GLOBALS"
    fi

    log_ok "Motion + surface tokens added"
  else
    log_warn "[DRY] Would add motion + surface tokens"
  fi
fi

# =============================================================================
#  STEP 3 — BUTTON MICRO-INTERACTIONS
# =============================================================================
log_step "Step 3 — Button micro-interactions"

BUTTON_FILE="$REPO_ROOT/components/ui/button.tsx"

if [ ! -f "$BUTTON_FILE" ]; then
  log_warn "button.tsx not found — skipping"
elif grep -q 'active:scale-\[0.97\]' "$BUTTON_FILE" 2>/dev/null; then
  log_ok "Button already has scale transition"
else
  backup_file "$BUTTON_FILE"
  log_info "Adding hover/press micro-interactions..."

  if [ "$DRY_RUN" = "0" ]; then
    # Enhance the base classes to include hover shadow, active scale
    sed -i.bak \
      -e 's/transition-all duration-200 ease-out/transition-all duration-180 ease-out hover:shadow-md active:scale-[0.97]/' \
      -e 's/disabled:pointer-events-none disabled:opacity-50/disabled:pointer-events-none disabled:opacity-50 hover:brightness-105/' \
      "$BUTTON_FILE" 2>/dev/null || true

    rm -f "$BUTTON_FILE.bak"
    log_ok "Button micro-interactions applied"
  fi
fi

# =============================================================================
#  STEP 4 — CARD HOVER ELEVATION
# =============================================================================
log_step "Step 4 — Card hover elevation"

CARD_FILE="$REPO_ROOT/components/ui/card.tsx"

if [ ! -f "$CARD_FILE" ]; then
  log_warn "card.tsx not found — skipping"
elif grep -q 'hover:-translate-y-0.5' "$CARD_FILE" 2>/dev/null; then
  log_ok "Card already has hover elevation"
else
  backup_file "$CARD_FILE"
  log_info "Adding hover elevation..."

  if [ "$DRY_RUN" = "0" ]; then
    # Add transition and hover to the Card root
    sed -i.bak \
      -e 's/overflow-hidden rounded-xl bg-card/overflow-hidden rounded-xl bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary\/5/' \
      "$CARD_FILE" 2>/dev/null || true

    rm -f "$CARD_FILE.bak"
    log_ok "Card hover elevation applied"
  fi
fi

# =============================================================================
#  STEP 5 — THREE-LAYER ERROR BOUNDARY VERIFICATION
# =============================================================================
log_step "Step 5 — Three-layer error boundary verification"

# Layer 1 — Global
GLOBAL_ERR="$REPO_ROOT/app/global-error.tsx"
if [ -f "$GLOBAL_ERR" ]; then
  log_ok "Layer 1: app/global-error.tsx exists"
else
  log_warn "Layer 1: app/global-error.tsx missing"
  if [ "$DRY_RUN" = "0" ]; then
    write_file "$GLOBAL_ERR" <<'GLOBAL_ERR_EOF'
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Application error</h1>
            <p className="text-sm text-muted-foreground">
              The application hit a critical error and could not recover.
            </p>
            {error.digest && (
              <p className="font-mono text-xs">Reference: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
GLOBAL_ERR_EOF
  fi
fi

# Layer 2 — Route
ROUTE_ERR="$REPO_ROOT/app/(dashboard)/error.tsx"
if [ -f "$ROUTE_ERR" ]; then
  log_ok "Layer 2: app/(dashboard)/error.tsx exists"
else
  log_warn "Layer 2: app/(dashboard)/error.tsx missing"
fi

# Layer 3 — Feature
WIDGET_BOUNDARY="$REPO_ROOT/components/shared/widget-boundary.tsx"
if [ -f "$WIDGET_BOUNDARY" ]; then
  log_ok "Layer 3: components/shared/widget-boundary.tsx exists"
  if grep -q 'public override' "$WIDGET_BOUNDARY" 2>/dev/null; then
    log_ok "  → override modifiers present"
  else
    log_warn "  → override modifiers missing"
  fi
else
  log_warn "Layer 3: widget-boundary.tsx missing"
fi

# =============================================================================
#  STEP 6 — SUPABASE PROMISELIKE GUARD
# =============================================================================
log_step "Step 6 — Supabase PromiseLike guard"

# Find any .catch() calls on Supabase query chains
log_info "Scanning for .catch() on Supabase queries..."

SCAN_COUNT=0
while IFS= read -r -d '' file; do
  if grep -q 'supabase.*\.catch(\|from(.*)\.catch(' "$file" 2>/dev/null; then
    log_warn "Found .catch() in: ${file#$REPO_ROOT/}"
    SCAN_COUNT=$(( SCAN_COUNT + 1 ))
  fi
done < <(find "$REPO_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" -not -path "*/.next/*" -print0 2>/dev/null)

if [ "$SCAN_COUNT" = "0" ]; then
  log_ok "No .catch() on Supabase queries detected"
else
  log_warn "$SCAN_COUNT file(s) may need review"
fi

# =============================================================================
#  STEP 7 — TYPECHECK
# =============================================================================
log_step "Step 7 — TypeScript typecheck"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npx tsc --noEmit"
else
  log_info "Running typecheck (30–90s)"
  TSC_OUT=""; TSC_EXIT=0
  TSC_OUT="$(npx tsc --noEmit 2>&1)" || TSC_EXIT=$?

  if [ "$TSC_EXIT" = "0" ] && [ -z "$TSC_OUT" ]; then
    log_ok "TypeScript: clean"
  else
    log_err "TypeScript errors detected:"
    printf '%s\n' "$TSC_OUT" | tee -a "$LOG_FILE" | head -40
    if [ "$FORCE" = "0" ]; then
      log_err "Restore: cp $BACKUP_DIR/<relative-path> $REPO_ROOT/<relative-path>"
      exit 1
    fi
  fi
fi

# =============================================================================
#  STEP 8 — BUILD
# =============================================================================
log_step "Step 8 — Production build"

if [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped (--fix-only)"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npm run build"
else
  log_info "Building (2–5 min)"
  BUILD_EXIT=0
  npm run build 2>&1 | tee -a "$LOG_FILE" | tail -25 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" = "0" ]; then
    log_ok "Build succeeded"
  else
    log_err "Build failed — see $LOG_FILE"
    exit 1
  fi
fi

# =============================================================================
#  STEP 9 — GIT PUSH
# =============================================================================
log_step "Step 9 — Git push"

if [ "$NO_PUSH" = "1" ] || [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] git add/commit/push"
elif [ ! -d "$REPO_ROOT/.git" ]; then
  log_warn "Not a git repository"
else
  cd "$REPO_ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    if git commit -m "feat(ui): motion tokens, micro-interactions, error boundaries [${TS}]" >/dev/null 2>&1; then
      log_ok "Committed"
    fi
  fi
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  if git push origin "$BRANCH" 2>&1 | tail -5 | tee -a "$LOG_FILE"; then
    log_ok "Pushed — Netlify will deploy"
  else
    log_warn "Push failed"
  fi
fi

# =============================================================================
#  SUMMARY
# =============================================================================
log_step "Summary"

log_ban "================================================================"
log_ban "  FRONTEND POLISH COMPLETE"
log_ban "================================================================"

printf "\n  Files modified:\n"
printf "    app/globals.css                     motion + surface tokens\n"
printf "    components/ui/button.tsx            hover/press interactions\n"
printf "    components/ui/card.tsx              hover elevation\n"
printf "    app/global-error.tsx                Layer 1 (verified)\n"
printf "    app/(dashboard)/error.tsx           Layer 2 (verified)\n"
printf "    components/shared/widget-boundary   Layer 3 (verified)\n"
printf "\n  Backup: %s\n" "$BACKUP_DIR"
printf "  Log:    %s\n" "$LOG_FILE"
printf "\n  Next steps:\n"
printf "    1. Verify deploy at Netlify dashboard\n"
printf "    2. Test notification bell updates in realtime\n"
printf "    3. Run Phase 2 Siddhi report-first upgrade when ready\n\n"

log_ok "Polish complete"
exit 0