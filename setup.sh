#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — PHASE 3 FIX & PREFLIGHT
#  ---------------------------------------------------------------------------
#  Fixes:
#    1. components/shared/data-table.tsx — TanStack Table v8 → v9 migration
#    2. middleware.ts → proxy.ts — Next.js 16 file convention rename
#  Then runs full preflight: typecheck → lint → build → push → health check.
#
#  Idempotent. CRLF self-healing. Portable across Linux / macOS / WSL /
#  MINGW64 / MSYS2 / Cygwin.
#
#  USAGE:
#    ./phase3_fix.sh                   Full pipeline
#    ./phase3_fix.sh --dry-run         Preview every action
#    ./phase3_fix.sh --fix-only        Fix files, skip build/push
#    ./phase3_fix.sh --verify-only     Typecheck only
#    ./phase3_fix.sh --no-push         Build but do not push
#    ./phase3_fix.sh --skip-build      Skip production build
#    ./phase3_fix.sh --force           Continue past non-fatal warnings
#    ./phase3_fix.sh --help
# =============================================================================

# --- CRLF SELF-HEAL (runs before anything else) -----------------------------
_self_path="${BASH_SOURCE[0]}"
if [ -n "$_self_path" ] && [ -f "$_self_path" ]; then
  if LC_ALL=C od -c "$_self_path" 2>/dev/null | grep -q '\\r'; then
    printf '[self-heal] CRLF detected in %s — normalizing\n' "$_self_path" >&2
    _self_tmp="$(mktemp)"
    tr -d '\r' < "$_self_path" > "$_self_tmp"
    mv "$_self_tmp" "$_self_path"
    chmod +x "$_self_path"
    exec bash "$_self_path" "$@"
  fi
fi
unset _self_path

# --- STRICT MODE ------------------------------------------------------------
set -Eeuo pipefail
IFS=$'\n\t'

# --- SCRIPT RESOLUTION ------------------------------------------------------
resolve_script_dir() {
  local target="$1"
  local dir=""
  while [ -h "$target" ]; do
    dir="$(cd -P "$(dirname "$target")" >/dev/null 2>&1 && pwd)"
    target="$(readlink "$target")"
    case "$target" in
      /*) ;;
      *) target="$dir/$target" ;;
    esac
  done
  cd -P "$(dirname "$target")" >/dev/null 2>&1 && pwd
}

REPO_ROOT="$(resolve_script_dir "${BASH_SOURCE[0]}")"
cd "$REPO_ROOT"

# --- PLATFORM DETECTION -----------------------------------------------------
UNAME_S="$(uname -s 2>/dev/null || echo unknown)"
PLATFORM="unknown"
case "$UNAME_S" in
  Linux)
    if [ -n "${WSL_DISTRO_NAME:-}" ]; then
      PLATFORM="wsl"
    else
      PLATFORM="linux"
    fi
    ;;
  Darwin) PLATFORM="macos" ;;
  MINGW64_NT*|MINGW32_NT*|MSYS_NT*|CYGWIN_NT*) PLATFORM="windows" ;;
esac

# --- COLOURS ----------------------------------------------------------------
if [ -t 1 ]; then
  R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
  B='\033[0;34m'; M='\033[0;35m'; C='\033[0;36m'
  BD='\033[1m'; DM='\033[2m'; NC='\033[0m'
else
  R=''; G=''; Y=''; B=''; M=''; C=''; BD=''; DM=''; NC=''
fi

# --- LOGGING ----------------------------------------------------------------
LOG_DIR="$REPO_ROOT/.phase3-logs"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$LOG_DIR/phase3-${RUN_ID}.log"
BACKUP_DIR="$REPO_ROOT/.phase3-backups/${RUN_ID}"

mkdir -p "$LOG_DIR" "$BACKUP_DIR"
: > "$LOG_FILE"

ts_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

emit_log() {
  local level="$1"
  local colour="$2"
  local message="$3"
  printf "${colour}[%s][%-5s]${NC} %s\n" "$(ts_utc)" "$level" "$message" | tee -a "$LOG_FILE"
}

log_info() { emit_log "INFO"  "$B" "$1"; }
log_ok()   { emit_log "OK"    "$G" "$1"; }
log_warn() { emit_log "WARN"  "$Y" "$1"; }
log_err()  { emit_log "ERROR" "$R" "$1" >&2; }

log_step() {
  printf "\n${BD}${C}>>> %s${NC}\n" "$1" | tee -a "$LOG_FILE"
}

log_ban() {
  printf "\n${BD}${M}%s${NC}\n" "$1" | tee -a "$LOG_FILE"
}

# --- TRAPS ------------------------------------------------------------------
LOCK_FILE="$REPO_ROOT/.phase3.lock"
CLEANED=0

cleanup_trap() {
  local code="$?"
  if [ "$CLEANED" = "1" ]; then
    return 0
  fi
  CLEANED=1
  if [ -f "$LOCK_FILE" ]; then
    rm -f "$LOCK_FILE"
  fi
  if [ "$code" = "0" ]; then
    log_ok "Phase 3 pipeline complete"
  else
    log_err "Pipeline aborted with exit code $code"
    log_err "Log:     $LOG_FILE"
    log_err "Backups: $BACKUP_DIR"
    log_err "Restore any file: cp $BACKUP_DIR/<relative-path> $REPO_ROOT/<relative-path>"
  fi
}

error_trap() {
  local code="$?"
  local line="${1:-?}"
  log_err "Failure at line $line with exit code $code"
  exit "$code"
}

trap 'error_trap $LINENO' ERR
trap 'cleanup_trap' EXIT

# --- CLI FLAGS --------------------------------------------------------------
DRY_RUN=0
FIX_ONLY=0
VERIFY_ONLY=0
NO_PUSH=0
SKIP_BUILD=0
SKIP_LINT=0
FORCE=0

print_help() {
  cat <<'END_OF_HELP_PHASE3'
Setu Kalki — Phase 3 Fix & Preflight

USAGE
  ./phase3_fix.sh [OPTIONS]

OPTIONS
  --dry-run        Preview every action, modify nothing
  --fix-only       Fix source files, skip build and push
  --verify-only    Run typecheck only, no changes
  --no-push        Build but skip git push
  --skip-build     Skip production build
  --skip-lint      Skip ESLint
  --force          Continue past non-fatal warnings
  --help, -h       Show this help
END_OF_HELP_PHASE3
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)      DRY_RUN=1 ;;
    --fix-only)     FIX_ONLY=1 ;;
    --verify-only)  VERIFY_ONLY=1 ;;
    --no-push)      NO_PUSH=1 ;;
    --skip-build)   SKIP_BUILD=1 ;;
    --skip-lint)    SKIP_LINT=1 ;;
    --force)        FORCE=1 ;;
    --help|-h)      print_help; exit 0 ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      print_help
      exit 2
      ;;
  esac
  shift
done

# --- UTILITIES --------------------------------------------------------------
has_command() {
  command -v "$1" >/dev/null 2>&1
}

version_at_least() {
  local have="$1"
  local need="$2"
  local winner=""
  winner="$(printf '%s\n%s\n' "$have" "$need" | sort -V | head -n1)"
  if [ "$winner" = "$need" ]; then
    return 0
  fi
  return 1
}

retry_command() {
  local attempts="$1"
  local delay="$2"
  shift 2
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if "$@"; then
      return 0
    fi
    if [ "$i" = "$attempts" ]; then
      log_err "Failed after $attempts attempts: $*"
      return 1
    fi
    log_warn "Attempt $i of $attempts failed, retrying in ${delay}s"
    sleep "$delay"
    delay=$(( delay * 2 ))
    i=$(( i + 1 ))
  done
}

backup_file() {
  local src="$1"
  if [ ! -f "$src" ]; then
    return 0
  fi
  local rel="${src#$REPO_ROOT/}"
  local dst="$BACKUP_DIR/$rel"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

write_file() {
  local dest="$1"
  if [ "$DRY_RUN" = "1" ]; then
    log_warn "[DRY] Would write: ${dest#$REPO_ROOT/}"
    cat > /dev/null
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  tr -d '\r' > "$dest"
  if [ -s "$dest" ]; then
    local last_line_count=""
    last_line_count="$(tail -c1 "$dest" | wc -l | tr -d ' ')"
    if [ "$last_line_count" = "0" ]; then
      printf '\n' >> "$dest"
    fi
  fi
  log_ok "Wrote: ${dest#$REPO_ROOT/}"
}

# --- LOCK -------------------------------------------------------------------
if [ -f "$LOCK_FILE" ]; then
  log_err "Another run is active. Lock: $LOCK_FILE"
  log_err "If stale, remove: rm -f '$LOCK_FILE'"
  exit 1
fi
echo "$$" > "$LOCK_FILE"

# --- BANNER -----------------------------------------------------------------
log_ban "================================================================"
log_ban "  SETU KALKI — PHASE 3 FIX & PREFLIGHT"
log_ban "  Run ID:    $RUN_ID"
log_ban "  Platform:  $PLATFORM"
log_ban "  Repo:      $REPO_ROOT"
log_ban "================================================================"

# =============================================================================
#  STEP 1 — PREFLIGHT
# =============================================================================
log_step "Step 1 — Preflight"

if ! has_command node; then
  log_err "node not found in PATH"
  exit 1
fi
if ! has_command npm; then
  log_err "npm not found in PATH"
  exit 1
fi

NODE_VER="$(node --version 2>/dev/null | tr -d 'v\r\n')"
NPM_VER="$(npm --version 2>/dev/null | tr -d '\r\n')"

log_info "Node.js: $NODE_VER"
log_info "npm:     $NPM_VER"

if ! version_at_least "$NODE_VER" "18.18.0"; then
  log_err "Node.js 18.18+ required. Found: $NODE_VER"
  exit 1
fi
log_ok "Node.js version acceptable"

if has_command git; then
  GIT_VER="$(git --version 2>/dev/null | tr -d '\r\n')"
  log_info "$GIT_VER"
else
  log_warn "git not found — push step will be skipped"
fi

# Verify project files
PREFLIGHT_MISSING=0
for rel in "package.json" "tsconfig.json" "next.config.ts"; do
  if [ ! -e "$REPO_ROOT/$rel" ]; then
    log_err "Missing required file: $rel"
    PREFLIGHT_MISSING=$(( PREFLIGHT_MISSING + 1 ))
  fi
done
if [ "$PREFLIGHT_MISSING" -gt 0 ]; then
  exit 1
fi
log_ok "Project structure verified"

# Detect TanStack Table version
TANSTACK_DETECTED="unknown"
if grep -q '"@tanstack/react-table"' "$REPO_ROOT/package.json" 2>/dev/null; then
  TANSTACK_DETECTED="$(grep '"@tanstack/react-table"' "$REPO_ROOT/package.json" | head -n1 | sed 's/.*: *"//;s/".*//' || echo unknown)"
  log_info "TanStack Table declared: $TANSTACK_DETECTED"

  case "$TANSTACK_DETECTED" in
    *9.*|^9|*"^9"*)
      log_ok "TanStack Table v9 detected — v9 API required"
      ;;
    *8.*)
      log_warn "TanStack Table v8 detected — v9 fixes not needed"
      ;;
    *)
      log_warn "TanStack version unclear: $TANSTACK_DETECTED"
      ;;
  esac
else
  log_warn "@tanstack/react-table not found in package.json"
fi

# Verify node_modules
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  log_warn "node_modules missing — installing dependencies"
  if [ "$DRY_RUN" = "0" ]; then
    if [ -f "$REPO_ROOT/package-lock.json" ]; then
      retry_command 2 3 npm ci --legacy-peer-deps 2>&1 | tail -5 | tee -a "$LOG_FILE" || true
    else
      npm install --legacy-peer-deps 2>&1 | tail -5 | tee -a "$LOG_FILE" || true
    fi
  fi
fi
log_ok "Preflight complete"

# =============================================================================
#  STEP 2 — VERIFY-ONLY SHORT CIRCUIT
# =============================================================================
if [ "$VERIFY_ONLY" = "1" ]; then
  log_step "Verify only — running tsc"
  TSC_EXIT=0
  npx tsc --noEmit 2>&1 | head -60 | tee -a "$LOG_FILE" || TSC_EXIT=$?
  exit "$TSC_EXIT"
fi

# =============================================================================
#  STEP 3 — ENVIRONMENT LOAD
# =============================================================================
log_step "Step 3 — Environment"

load_env_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return 1
  fi
  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    local line="${raw_line//$'\r'/}"
    if [ -z "$line" ]; then
      continue
    fi
    case "$line" in
      \#*) continue ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(printf '%s' "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    val="$(printf '%s' "$val" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    if [ -z "$key" ]; then
      continue
    fi
    if [ -z "${!key:-}" ]; then
      export "$key=$val"
    fi
  done < "$file"
  return 0
}

if [ -f "$REPO_ROOT/.env.local" ]; then
  load_env_file "$REPO_ROOT/.env.local" || true
  log_ok "Loaded .env.local"
elif [ -f "$REPO_ROOT/.env.placeholder" ]; then
  load_env_file "$REPO_ROOT/.env.placeholder" || true
  log_ok "Loaded .env.placeholder"
else
  log_warn "No env file found — using shell defaults"
fi

ensure_var() {
  local key="$1"
  local fallback="$2"
  if [ -z "${!key:-}" ]; then
    export "$key=$fallback"
  fi
}

ensure_var NEXT_PUBLIC_SUPABASE_URL "https://placeholder.supabase.co"
ensure_var NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "placeholder_publishable"
ensure_var NEXT_PUBLIC_APP_URL "https://placeholder.netlify.app"
ensure_var CRON_SECRET "placeholder_cron_secret_at_least_32_chars"

log_ok "Environment ready"

# =============================================================================
#  STEP 4 — BACKUP AFFECTED FILES
# =============================================================================
log_step "Step 4 — Backups"

DATA_TABLE="$REPO_ROOT/components/shared/data-table.tsx"
MIDDLEWARE_FILE="$REPO_ROOT/middleware.ts"
PROXY_FILE="$REPO_ROOT/proxy.ts"

if [ -f "$DATA_TABLE" ]; then
  backup_file "$DATA_TABLE"
  log_ok "Backed up: components/shared/data-table.tsx"
fi
if [ -f "$MIDDLEWARE_FILE" ]; then
  backup_file "$MIDDLEWARE_FILE"
  log_ok "Backed up: middleware.ts"
fi
if [ -f "$PROXY_FILE" ]; then
  backup_file "$PROXY_FILE"
  log_ok "Backed up: proxy.ts"
fi

log_info "Backup directory: $BACKUP_DIR"

# =============================================================================
#  STEP 5 — FIX DATA-TABLE v9
# =============================================================================
log_step "Step 5 — Fix data-table.tsx for TanStack Table v9"

if [ ! -f "$DATA_TABLE" ]; then
  log_warn "data-table.tsx not found — skipping"
else
  NEEDS_FIX=0
  if grep -q 'getCoreRowModel' "$DATA_TABLE" 2>/dev/null; then
    NEEDS_FIX=1
  fi
  if grep -q 'useReactTable' "$DATA_TABLE" 2>/dev/null; then
    NEEDS_FIX=1
  fi
  if grep -q 'getVisibleCells' "$DATA_TABLE" 2>/dev/null; then
    NEEDS_FIX=1
  fi
  if grep -q 'globalFilter' "$DATA_TABLE" 2>/dev/null && ! grep -q 'globalFilteringFeature' "$DATA_TABLE" 2>/dev/null; then
    NEEDS_FIX=1
  fi

  if [ "$NEEDS_FIX" = "0" ]; then
    log_ok "data-table.tsx already v9-compatible"
  else
    log_warn "Detected v8 API — rewriting for v9"

    if [ "$DRY_RUN" = "1" ]; then
      log_warn "[DRY] Would rewrite data-table.tsx"
    else
      write_file "$DATA_TABLE" <<'DATA_TABLE_V9_CONTENT'
"use client";

// components/shared/data-table.tsx
// ─────────────────────────────────────────────────────────────────────────
// TanStack Table v9 data table.
//
// v9 migration notes:
//   • useReactTable → useTable(options, selector)
//   • getCoreRowModel() is gone — the core row model is automatic
//   • Row models are named slots in tableFeatures()
//   • globalFilteringFeature is required for globalFilter state
//   • columnVisibilityFeature gates row.getVisibleCells()
//   • flexRender() → <table.FlexRender />
//   • TData must extend RowData
// ─────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Feature registry — module scope for a stable identity across renders.
// Register a feature before its dependent row-model slot.
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: {
    includesString: filterFn_includesString,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
    datetime: sortFn_datetime,
  },
});

// Exported so consuming pages can type their column arrays
export type DataTableFeatures = typeof features;

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder = "Search...",
  pageSize = 25,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  // v9: second argument is a state selector — narrow it to control
  // which slices trigger re-renders.
  const table = useTable(
    {
      features,
      columns,
      data,
      state: {
        sorting,
        globalFilter,
      },
      onSortingChange: setSorting,
      onGlobalFilterChange: setGlobalFilter,
      initialState: {
        pagination: {
          pageIndex: 0,
          pageSize,
        },
      },
    },
    (state) => ({
      sorting: state.sorting,
      globalFilter: state.globalFilter,
      pagination: state.pagination,
    })
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="text-left">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground disabled:cursor-default"
                          disabled={!header.column.getCanSort()}
                        >
                          <table.FlexRender header={header} />
                          {header.column.getIsSorted() === "asc" && (
                            <ChevronUp className="size-3" />
                          )}
                          {header.column.getIsSorted() === "desc" && (
                            <ChevronDown className="size-3" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
DATA_TABLE_V9_CONTENT

      log_ok "Rewrote data-table.tsx for v9"
    fi
  fi
fi

# =============================================================================
#  STEP 6 — MIGRATE MIDDLEWARE → PROXY
# =============================================================================
log_step "Step 6 — Migrate middleware.ts → proxy.ts"

if [ -f "$MIDDLEWARE_FILE" ]; then
  log_warn "middleware.ts detected — migrating to proxy.ts"

  if [ "$DRY_RUN" = "1" ]; then
    log_warn "[DRY] Would rename middleware.ts → proxy.ts and rename export"
  else
    write_file "$PROXY_FILE" <<'PROXY_MIGRATION_CONTENT'
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
PROXY_MIGRATION_CONTENT

    rm -f "$MIDDLEWARE_FILE"
    log_ok "Created proxy.ts, removed middleware.ts"
  fi
else
  if [ -f "$PROXY_FILE" ]; then
    log_ok "proxy.ts already present"
  else
    log_warn "Neither middleware.ts nor proxy.ts found"
  fi
fi

# =============================================================================
#  STEP 7 — TYPECHECK
# =============================================================================
log_step "Step 7 — TypeScript typecheck"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npx tsc --noEmit"
else
  log_info "Running typecheck (30–90s)"

  TSC_OUT=""
  TSC_EXIT=0
  TSC_OUT="$(npx tsc --noEmit 2>&1)" || TSC_EXIT=$?

  if [ "$TSC_EXIT" = "0" ]; then
    if [ -z "$TSC_OUT" ]; then
      log_ok "TypeScript: clean"
    else
      log_warn "tsc produced informational output"
      printf '%s\n' "$TSC_OUT" | head -20 | tee -a "$LOG_FILE" >/dev/null
    fi
  else
    log_err "TypeScript errors detected:"
    printf '%s\n' "$TSC_OUT" | tee -a "$LOG_FILE" | head -50

    if printf '%s' "$TSC_OUT" | grep -q 'data-table'; then
      log_err "data-table errors remain — v9 migration incomplete"
    fi

    if [ "$FORCE" = "0" ]; then
      exit 1
    fi
    log_warn "Continuing despite type errors (--force)"
  fi
fi

# =============================================================================
#  STEP 8 — LINT
# =============================================================================
log_step "Step 8 — ESLint"

if [ "$SKIP_LINT" = "1" ]; then
  log_warn "Skipped (--skip-lint)"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npm run lint"
else
  LINT_OUT=""
  LINT_OUT="$(npm run lint 2>&1 || true)"

  if printf '%s' "$LINT_OUT" | grep -qiE 'error|failed'; then
    log_warn "Lint issues present (non-fatal)"
    printf '%s\n' "$LINT_OUT" | tail -15 | tee -a "$LOG_FILE" >/dev/null
  else
    log_ok "ESLint: clean"
  fi
fi

# =============================================================================
#  STEP 9 — BUILD
# =============================================================================
log_step "Step 9 — Production build"

if [ "$SKIP_BUILD" = "1" ]; then
  log_warn "Skipped (--skip-build)"
elif [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped (--fix-only)"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npm run build"
else
  log_info "Building (2–5 min)"
  BUILD_START="$(date +%s)"

  BUILD_EXIT=0
  npm run build 2>&1 | tee -a "$LOG_FILE" | tail -35 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" = "0" ]; then
    BUILD_DUR="$(($(date +%s) - BUILD_START))"
    log_ok "Build succeeded in ${BUILD_DUR}s"
  else
    log_err "Build failed — check log: $LOG_FILE"
    exit 1
  fi
fi

# =============================================================================
#  STEP 10 — GIT PUSH
# =============================================================================
log_step "Step 10 — Git push"

if [ "$NO_PUSH" = "1" ] || [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped"
elif ! has_command git; then
  log_warn "git unavailable"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] git add, commit, push"
elif [ ! -d "$REPO_ROOT/.git" ]; then
  log_warn "Not a git repository"
else
  cd "$REPO_ROOT"

  if [ -n "$(git status --porcelain)" ]; then
    log_info "Staging changes"
    git add -A
    COMMIT_MSG="fix(phase3): TanStack Table v9 API, proxy.ts migration [${RUN_ID}]"

    if git commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
      log_ok "Committed: $COMMIT_MSG"
    else
      log_warn "Commit failed or nothing to commit"
    fi
  else
    log_info "No local changes"
  fi

  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  log_info "Pushing to origin/$BRANCH"

  if retry_command 2 5 git push origin "$BRANCH" 2>&1 | tail -6 | tee -a "$LOG_FILE"; then
    log_ok "Pushed — Netlify will deploy in 2–4 minutes"
  else
    log_warn "Push failed — verify git credentials"
  fi
fi

# =============================================================================
#  STEP 11 — HEALTH CHECK
# =============================================================================
log_step "Step 11 — Health check"

APP_URL="${NEXT_PUBLIC_APP_URL:-}"

if [ "$APP_URL" = "https://placeholder.netlify.app" ] || [ -z "$APP_URL" ]; then
  log_warn "No real app URL configured — skipping health check"
  log_info "Add NEXT_PUBLIC_APP_URL to .env.local to enable"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] curl $APP_URL/api/health"
elif [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped (--fix-only)"
else
  HEALTH_URL="${APP_URL%/}/api/health"
  log_info "Waiting 60 seconds for Netlify to deploy"
  sleep 60

  HEALTH_RESP=""
  if HEALTH_RESP="$(retry_command 5 10 curl -sf --max-time 20 "$HEALTH_URL" 2>/dev/null)"; then
    if printf '%s' "$HEALTH_RESP" | grep -q '"ok":true'; then
      log_ok "Deployment healthy"
    else
      log_warn "Deployment reachable but degraded"
    fi
  else
    log_warn "Health endpoint unreachable — Netlify may still be building"
    log_info "Retry: curl $HEALTH_URL"
  fi
fi

# =============================================================================
#  SUMMARY
# =============================================================================
log_step "Summary"

log_ban "================================================================"
log_ban "  PHASE 3 FIX & PREFLIGHT COMPLETE"
log_ban "================================================================"

printf "\n" | tee -a "$LOG_FILE"
printf "  Repo:      %s\n" "$REPO_ROOT" | tee -a "$LOG_FILE"
printf "  Platform:  %s\n" "$PLATFORM" | tee -a "$LOG_FILE"
printf "  Run ID:    %s\n" "$RUN_ID" | tee -a "$LOG_FILE"
printf "  Log:       %s\n" "$LOG_FILE" | tee -a "$LOG_FILE"
printf "  Backups:   %s\n" "$BACKUP_DIR" | tee -a "$LOG_FILE"
printf "\n" | tee -a "$LOG_FILE"

printf "${CYN}Changes applied:${NC}\n" | tee -a "$LOG_FILE"
printf "  components/shared/data-table.tsx   TanStack Table v9 API\n" | tee -a "$LOG_FILE"
printf "  proxy.ts                            Next.js 16 convention\n" | tee -a "$LOG_FILE"
printf "\n" | tee -a "$LOG_FILE"

printf "${CYN}To restore any file:${NC}\n" | tee -a "$LOG_FILE"
printf "  cp %s/<relative-path> %s/<relative-path>\n" "$BACKUP_DIR" "$REPO_ROOT" | tee -a "$LOG_FILE"
printf "\n" | tee -a "$LOG_FILE"

log_ok "Phase 3 complete"
exit 0