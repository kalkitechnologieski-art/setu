#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — HOTFIX: NotificationAggregate + FORCE variable
# =============================================================================
set -Eeuo pipefail

FORCE=0

REPO_ROOT="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$REPO_ROOT"

G='\033[0;32m'; R='\033[0;31m'; C='\033[0;36m'; NC='\033[0m'
log_ok()   { printf "${G}[OK]${NC}   %s\n" "$1"; }
log_info() { printf "${C}[INFO]${NC} %s\n" "$1"; }
log_err()  { printf "${R}[ERR]${NC}  %s\n" "$1" >&2; }

TS="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$REPO_ROOT/.hotfix-backups/$TS"
mkdir -p "$BACKUP_DIR"

# =============================================================================
#  FIX 1 — Add missing types to lib/notifications/types.ts
# =============================================================================
log_info "Fixing lib/notifications/types.ts..."

NOTIF_TYPES="$REPO_ROOT/lib/notifications/types.ts"
if [ ! -f "$NOTIF_TYPES" ]; then
  log_err "Missing: $NOTIF_TYPES"
  exit 1
fi

cp "$NOTIF_TYPES" "$BACKUP_DIR/types.ts"

# Check if NotificationAggregate already exists
if grep -q 'NotificationAggregate' "$NOTIF_TYPES" 2>/dev/null; then
  log_ok "NotificationAggregate already defined"
else
  # Append the missing types
  cat >> "$NOTIF_TYPES" <<'APPEND_EOF'

// ─── Query filter shape ──────────────────────────────────────────────────
export interface NotificationFilters {
  unreadOnly?: boolean;
  kinds?: NotificationKind[];
  since?: string;
  until?: string;
}

// ─── Aggregate shape ─────────────────────────────────────────────────────
export interface NotificationAggregate {
  total: number;
  unread: number;
  byKind: Record<NotificationKind, number>;
}
APPEND_EOF
  log_ok "Appended NotificationFilters + NotificationAggregate"
fi

# =============================================================================
#  FIX 2 — Add FORCE=0 initialization to setup.sh
# =============================================================================
log_info "Fixing setup.sh (FORCE variable)..."

SETUP_FILE="$REPO_ROOT/setup.sh"
if [ -f "$SETUP_FILE" ]; then
  cp "$SETUP_FILE" "$BACKUP_DIR/setup.sh"

  if grep -q '^FORCE=' "$SETUP_FILE" 2>/dev/null; then
    log_ok "FORCE already initialized"
  else
    # Insert FORCE=0 after the DRY_RUN initialization block
    # Try to find the flag initialization section
    if grep -q '^DRY_RUN=0' "$SETUP_FILE"; then
      awk '
        /^DRY_RUN=0/ && !done {
          print
          print "FORCE=0"
          done = 1
          next
        }
        { print }
      ' "$SETUP_FILE" > "$SETUP_FILE.tmp" && mv "$SETUP_FILE.tmp" "$SETUP_FILE"
      log_ok "Inserted FORCE=0 after DRY_RUN=0"
    else
      # Fallback: insert after "set -Eeuo pipefail"
      awk '
        /^set -Eeuo pipefail/ && !done {
          print
          print ""
          print "FORCE=0"
          done = 1
          next
        }
        { print }
      ' "$SETUP_FILE" > "$SETUP_FILE.tmp" && mv "$SETUP_FILE.tmp" "$SETUP_FILE"
      log_ok "Inserted FORCE=0 after set -Eeuo pipefail"
    fi
  fi
else
  log_err "setup.sh not found — skipping FORCE fix"
fi

# =============================================================================
#  FIX 3 — Add NotificationFilters/NotificationAggregate imports to queries.ts
# =============================================================================
log_info "Verifying lib/notifications/queries.ts imports..."

NOTIF_QUERIES="$REPO_ROOT/lib/notifications/queries.ts"
if [ -f "$NOTIF_QUERIES" ]; then
  cp "$NOTIF_QUERIES" "$BACKUP_DIR/queries.ts"

  # Verify the imports resolve — just check that NotificationAggregate is imported
  if grep -q 'NotificationAggregate' "$NOTIF_QUERIES" 2>/dev/null; then
    log_ok "queries.ts imports NotificationAggregate (resolves now that types.ts exports it)"
  else
    log_info "queries.ts does not import NotificationAggregate — no action needed"
  fi
fi

# =============================================================================
#  STEP 4 — TYPECHECK
# =============================================================================
log_info "Running typecheck..."

TSC_OUT=""
TSC_EXIT=0
TSC_OUT="$(npx tsc --noEmit 2>&1)" || TSC_EXIT=$?

if [ "$TSC_EXIT" = "0" ] && [ -z "$TSC_OUT" ]; then
  log_ok "TypeScript: clean"
else
  log_err "TypeScript errors remain:"
  printf '%s\n' "$TSC_OUT" | head -40
  log_err "Backups: $BACKUP_DIR"
  exit 1
fi

# =============================================================================
#  STEP 5 — BUILD
# =============================================================================
log_info "Running build..."

BUILD_EXIT=0
npm run build 2>&1 | tail -20 || BUILD_EXIT=$?

if [ "$BUILD_EXIT" = "0" ]; then
  log_ok "Build succeeded"
else
  log_err "Build failed"
  exit 1
fi

# =============================================================================
#  SUMMARY
# =============================================================================
printf "\n  Fixes applied:\n"
printf "    lib/notifications/types.ts   +NotificationFilters +NotificationAggregate\n"
printf "    setup.sh                     +FORCE=0 initialization\n"
printf "\n  Backup: %s\n" "$BACKUP_DIR"
printf "\n"

log_ok "Hotfix complete"
exit 0
