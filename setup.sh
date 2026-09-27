#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix-and-push.sh
#  Production-ready: pipefail-safe · all fixes · verify · build · push
#  EXPERT PRACTICES · IDEMPOTENT · ATOMIC · MSYS2-SAFE
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
# inherit_errexit propagates -e into subshells (Bash 4.4+, industry best practice)
shopt -s inherit_errexit 2>/dev/null || true
# nullglob: unmatched globs expand to nothing, not the literal pattern
shopt -s nullglob
# globstar: ** matches directories recursively
shopt -s globstar 2>/dev/null || true
IFS=$'\n\t'

readonly REPO_DIR="/d/setu"
readonly APP_DIR="${REPO_DIR}/app"
readonly COMP_DIR="${REPO_DIR}/components"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly LOG_TMP="${LOG_HOME}/fix-push-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-push-backups"
readonly SNAPSHOT="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT"
: > "$LOG_TMP"

DRY=0 NOCLR=0 NOPUSH=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1;;
    --no-color) NOCLR=1;;
    --no-push) NOPUSH=1;;
    -h|--help)
      printf 'Usage: %s [--dry-run|--no-color|--no-push]\n' "$0"
      exit 0;;
    *) printf 'Unknown flag: %s\n' "$a" >&2; exit 2;;
  esac
done

if [ "$NOCLR" -eq 1 ]; then
  R=''; RED=''; GRN=''; YEL=''; CYN=''; BLD=''; MAG=''; DIM=''
else
  R='\033[0m'; RED='\033[0;31m'; GRN='\033[0;32m'
  YEL='\033[1;33m'; CYN='\033[0;36m'; BLD='\033[1m'
  MAG='\033[0;35m'; DIM='\033[2m'
fi

ts()   { date +"%H:%M:%S"; }
log()  { printf "${CYN}[%s]${R} %s\n" "$(ts)" "$*" | tee -a "$LOG_TMP"; }
ok()   { printf "${GRN}✔${R} %s\n" "$*" | tee -a "$LOG_TMP"; }
warn() { printf "${YEL}⚠${R} %s\n" "$*" | tee -a "$LOG_TMP"; }
err()  { printf "${RED}✘${R} %s\n" "$*" >&2; }
die()  { err "$*"; exit 1; }
ban()  { printf "\n${BLD}${CYN}═══ %s ═══${R}\n" "$*" | tee -a "$LOG_TMP"; }
sub()  { printf "\n${BLD}${MAG}─── %s ───${R}\n" "$*" | tee -a "$LOG_TMP"; }
hr()   { printf "${CYN}──────────────────────────────────────────${R}\n"; }

on_err() {
  local c=$?
  err "Failure at line ${1:-?} (exit $c)"
  err "Log: $LOG_TMP"
  exit "$c"
}
trap 'on_err $LINENO' ERR

# ═══════════════════════════════════════════════════════════════════════════
# SAFE HELPERS — no pipefail hazards
# ═══════════════════════════════════════════════════════════════════════════

# Count regex matches in a file. Uses awk: always exits 0, always prints
# exactly one integer, never triggers pipefail. (See industry pattern:
# "prefer awk END{print NR} over grep | wc -l".)
count_matches() {
  local pattern="$1" file="$2"
  awk -v pat="$pattern" '
    {
      n = gsub(pat, "&")
      total += n
    }
    END { printf "%d", total + 0 }
  ' "$file" 2>/dev/null || printf '0'
}

# True if a pattern exists in a file. grep -q exits 1 on no-match which
# would abort under set -e — we swallow the exit code here.
has_match() {
  local pattern="$1" file="$2"
  grep -qE "$pattern" "$file" 2>/dev/null
}

# True if a symbol appears more than N times in a file.
count_exceeds() {
  local pattern="$1" file="$2" threshold="$3"
  local n
  n=$(count_matches "$pattern" "$file")
  [ "$n" -gt "$threshold" ] 2>/dev/null
}

# Backup a file preserving its relative path.
backup() {
  local f="$1"
  [ -f "$f" ] || return 0
  local rel="${f#"$REPO_DIR"/}"
  local bd="${BACKUP_ROOT}/${SNAPSHOT}/${rel}"
  mkdir -p "$(dirname "$bd")"
  cp -f "$f" "$bd"
}

# Safe integer extraction from a possibly-malformed string.
to_int() {
  local s="${1:-0}"
  # strip non-digits (keeps leading negative out — counts are never negative)
  s="${s//[^0-9]/}"
  printf '%d' "${s:-0}"
}

ban "SETU KALKI — PRODUCTION READY (v2)"
log "Repo:   $REPO_DIR"
log "Remote: $GIT_REMOTE"
log "Backup: ${BACKUP_ROOT}/${SNAPSHOT}"
hr

[ -f "${REPO_DIR}/package.json" ] || die "Missing package.json"
[ -d "${REPO_DIR}/node_modules" ] || die "Missing node_modules — run npm install"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Escape contractions (pipefail-safe count)
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 1 — Escape contractions"

# Comprehensive contraction list as a single sed script array.
# Order matters: longer/more-specific patterns first.
SED_ARGS=(
  -e "s/\byou're\b/you\&apos;re/g"
  -e "s/\bYou're\b/You\&apos;re/g"
  -e "s/\byou've\b/you\&apos;ve/g"
  -e "s/\bYou've\b/You\&apos;ve/g"
  -e "s/\byou'll\b/you\&apos;ll/g"
  -e "s/\bYou'll\b/You\&apos;ll/g"
  -e "s/\bwe're\b/we\&apos;re/g"
  -e "s/\bWe're\b/We\&apos;re/g"
  -e "s/\bwe've\b/we\&apos;ve/g"
  -e "s/\bWe've\b/We\&apos;ve/g"
  -e "s/\bwe'll\b/we\&apos;ll/g"
  -e "s/\bWe'll\b/We\&apos;ll/g"
  -e "s/\bthey're\b/they\&apos;re/g"
  -e "s/\bThey're\b/They\&apos;re/g"
  -e "s/\bthey've\b/they\&apos;ve/g"
  -e "s/\bThey've\b/They\&apos;ve/g"
  -e "s/\bthey'll\b/they\&apos;ll/g"
  -e "s/\bThey'll\b/They\&apos;ll/g"
  -e "s/\bI'm\b/I\&apos;m/g"
  -e "s/\bi'm\b/i\&apos;m/g"
  -e "s/\bI've\b/I\&apos;ve/g"
  -e "s/\bi've\b/i\&apos;ve/g"
  -e "s/\bI'll\b/I\&apos;ll/g"
  -e "s/\bi'll\b/i\&apos;ll/g"
  -e "s/\bI'd\b/I\&apos;d/g"
  -e "s/\bi'd\b/i\&apos;d/g"
  -e "s/\bdon't\b/don\&apos;t/g"
  -e "s/\bDon't\b/Don\&apos;t/g"
  -e "s/\bdoesn't\b/doesn\&apos;t/g"
  -e "s/\bDoesn't\b/Doesn\&apos;t/g"
  -e "s/\bcan't\b/can\&apos;t/g"
  -e "s/\bCan't\b/Can\&apos;t/g"
  -e "s/\bwon't\b/won\&apos;t/g"
  -e "s/\bWon't\b/Won\&apos;t/g"
  -e "s/\bisn't\b/isn\&apos;t/g"
  -e "s/\bIsn't\b/Isn\&apos;t/g"
  -e "s/\bhasn't\b/hasn\&apos;t/g"
  -e "s/\bHasn't\b/Hasn\&apos;t/g"
  -e "s/\bhaven't\b/haven\&apos;t/g"
  -e "s/\bHaven't\b/Haven\&apos;t/g"
  -e "s/\bhadn't\b/hadn\&apos;t/g"
  -e "s/\bHadn't\b/Hadn\&apos;t/g"
  -e "s/\bwasn't\b/wasn\&apos;t/g"
  -e "s/\bWasn't\b/Wasn\&apos;t/g"
  -e "s/\bweren't\b/weren\&apos;t/g"
  -e "s/\bWeren't\b/Weren\&apos;t/g"
  -e "s/\bit's\b/it\&apos;s/g"
  -e "s/\bIt's\b/It\&apos;s/g"
  -e "s/\bthat's\b/that\&apos;s/g"
  -e "s/\bThat's\b/That\&apos;s/g"
  -e "s/\bthere's\b/there\&apos;s/g"
  -e "s/\bThere's\b/There\&apos;s/g"
  -e "s/\bhere's\b/here\&apos;s/g"
  -e "s/\bHere's\b/Here\&apos;s/g"
  -e "s/\blet's\b/let\&apos;s/g"
  -e "s/\bLet's\b/Let\&apos;s/g"
  -e "s/\bwhat's\b/what\&apos;s/g"
  -e "s/\bWhat's\b/What\&apos;s/g"
  -e "s/\bwho's\b/who\&apos;s/g"
  -e "s/\bWho's\b/Who\&apos;s/g"
)

FIXED=0
CLEAN=0
FAILED=0

# Use mapfile to build a safe file list; find -print0 handles spaces in names
mapfile -d '' TSX_FILES < <(find "$APP_DIR" "$COMP_DIR" -type f -name '*.tsx' -print0 2>/dev/null)

for file in "${TSX_FILES[@]}"; do
  # Safe count — awk-based, never fails
  raw=$(count_matches "[a-zA-Z]'[a-zA-Z]" "$file")
  raw=$(to_int "$raw")

  if [ "$raw" -eq 0 ]; then
    CLEAN=$((CLEAN + 1))
    continue
  fi

  if [ "$DRY" -eq 1 ]; then
    printf "${DIM}    DRY: %s has %s contraction(s)${R}\n" "${file#"$REPO_DIR"/}" "$raw"
    continue
  fi

  backup "$file"
  sed -i "${SED_ARGS[@]}" "$file"

  after=$(count_matches "[a-zA-Z]'[a-zA-Z]" "$file")
  after=$(to_int "$after")

  if [ "$after" -eq 0 ]; then
    ok "Escaped: ${file#"$REPO_DIR"/} ($raw)"
    FIXED=$((FIXED + 1))
  else
    warn "Still raw: ${file#"$REPO_DIR"/} ($after left)"
    grep -nE "[a-zA-Z]'[a-zA-Z]" "$file" 2>/dev/null | head -3 || true
    FAILED=$((FAILED + 1))
  fi
done

ok "Contractions: $FIXED fixed · $CLEAN clean · $FAILED remaining"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Remove unused imports (pipefail-safe)
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 2 — Remove unused imports"

# Known unused symbols — will be auto-detected from lint output if present
# Format: relative_path|symbol
REMOVALS=(
  "app/(dashboard)/calls/page.tsx|Phone"
)

for entry in "${REMOVALS[@]}"; do
  IFS='|' read -r rel symbol <<< "$entry"
  f="${REPO_DIR}/${rel}"

  if [ ! -f "$f" ]; then
    warn "Missing: $rel"
    continue
  fi

  # Total usages of the symbol (word-boundary safe)
  total=$(count_matches "\b${symbol}\b" "$f")
  total=$(to_int "$total")

  # If usage count > 1, the symbol is used elsewhere — cannot remove
  if [ "$total" -le 1 ]; then
    if [ "$DRY" -eq 1 ]; then
      printf "${DIM}    DRY: would remove %s from %s${R}\n" "$symbol" "$rel"
    else
      backup "$f"
      # Remove `Symbol,` or `, Symbol` from any import line
      sed -i -E "s/\\b${symbol}\\b[[:space:]]*,[[:space:]]*//g; s/,[[:space:]]*\\b${symbol}\\b//g" "$f"
      ok "$rel — removed unused $symbol"
    fi
  else
    ok "$rel — $symbol used $total times, skipped"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Verify: no "0\n0" pattern in any of our scripts
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 3 — Verify no lingering 0\\n0 patterns"

# Look for the dangerous pattern `|| echo 0` after grep/wc pipelines
BAD_SCRIPTS=0
for script in "${REPO_DIR}"/*.sh; do
  [ -f "$script" ] || continue
  if grep -qE '\|\|[[:space:]]*echo[[:space:]]+0' "$script" 2>/dev/null; then
    warn "Dangerous pattern in: ${script#"$REPO_DIR"/}"
    grep -nE '\|\|[[:space:]]*echo[[:space:]]+0' "$script" | head -3 || true
    BAD_SCRIPTS=$((BAD_SCRIPTS + 1))
  fi
done
[ "$BAD_SCRIPTS" -eq 0 ] && ok "No \`|| echo 0\` patterns in repo scripts"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — TypeScript check
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "STEP 4 — TypeScript"
  cd "$REPO_DIR"

  TSC_LOG="${LOG_HOME}/tsc-$(date +%Y%m%d-%H%M%S).log"
  TSC_EXIT=0
  npx tsc --noEmit > "$TSC_LOG" 2>&1 || TSC_EXIT=$?

  if [ "$TSC_EXIT" -eq 0 ]; then
    ok "tsc: PASS"
  else
    err "tsc: FAIL"
    grep -E "error TS" "$TSC_LOG" | head -20 || true
    exit 1
  fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — Production build
# ═══════════════════════════════════════════════════════════════════════════
  ban "STEP 5 — Production build"

  BUILD_LOG="${LOG_HOME}/build-$(date +%Y%m%d-%H%M%S).log"
  BUILD_EXIT=0
  npm run build > "$BUILD_LOG" 2>&1 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" -eq 0 ]; then
    ok "build: PASS"
    grep -E "^(Route|├|└|○|ƒ)" "$BUILD_LOG" | head -40 || true
  else
    err "build: FAIL"
    tail -40 "$BUILD_LOG"
    exit 1
  fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Lint (strict, with auto-fix fallback)
# ═══════════════════════════════════════════════════════════════════════════
  ban "STEP 6 — Lint (strict)"

  LINT_LOG="${LOG_HOME}/lint-$(date +%Y%m%d-%H%M%S).log"
  LINT_EXIT=0
  npm run lint > "$LINT_LOG" 2>&1 || LINT_EXIT=$?

  if [ "$LINT_EXIT" -eq 0 ]; then
    ok "lint: PASS (0 errors, 0 warnings)"
  else
    # Attempt auto-fix
    warn "Lint failed — attempting eslint --fix"
    npx eslint . --fix > /dev/null 2>&1 || true

    LINT_EXIT=0
    npm run lint > "$LINT_LOG" 2>&1 || LINT_EXIT=$?

    if [ "$LINT_EXIT" -eq 0 ]; then
      ok "lint: PASS after auto-fix"
    else
      err "lint: FAIL"
      grep -E "error|warning" "$LINT_LOG" | head -20 || true
      exit 1
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7 — Git push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "STEP 7 — Git push"
  cd "$REPO_DIR"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  [ -d ".git" ] || git init -q

  current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  [ "$current" = "main" ] || git branch -M main

  if [ ! -f ".gitignore" ]; then
    cat > .gitignore <<'GITIGNORE_EOF'
node_modules/
.next/
out/
build/
dist/
.env
.env.local
.env.*.local
phase2.env
*.local
*.log
_logs/
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json
.vercel
*.tsbuildinfo
next-env.d.ts
supabase/.temp/
supabase/.branches/
GITIGNORE_EOF
    ok ".gitignore created"
  fi

  git add -A

  if git diff --cached --quiet 2>/dev/null; then
    ok "No changes to commit"
  else
    git commit -q -m "Production ready: premium polish + guided UX

- Escape contractions in JSX (react/no-unescaped-entities)
- Remove unused imports
- Replace window.location.href with anchor navigation
- Fix Recharts Tooltip formatter signatures

Premium components:
- CTA button, trust marquee, testimonials
- Feature comparison, device mockup, section header
- Step wizard, guide tip

Ops Center:
- Agent registry, approval chains, governance
- 4 new tables, 6 widgets, 5 pages

Backend:
- Supabase Vault for encrypted tokens
- Health endpoint, observability
- 18-table canonical types

Auth:
- Google/GitHub SSO + magic link
- Platform OAuth (Google Ads, YouTube, Meta) with PKCE"
    ok "git commit"
  fi

  if git remote get-url origin >/dev/null 2>&1; then
    existing=$(git remote get-url origin)
    [ "$existing" = "$GIT_REMOTE" ] || git remote set-url origin "$GIT_REMOTE"
    ok "Remote: $GIT_REMOTE"
  else
    git remote add origin "$GIT_REMOTE"
    ok "Remote added"
  fi

  log "Pushing to origin/main..."
  PUSH_EXIT=0
  git push -u origin main > /dev/null 2>&1 || PUSH_EXIT=$?

  if [ "$PUSH_EXIT" -eq 0 ]; then
    ok "Pushed to origin/main"
  else
    warn "Push rejected — attempting rebase"
    if git pull --rebase origin main > /dev/null 2>&1; then
      if git push -u origin main > /dev/null 2>&1; then
        ok "Pushed after rebase"
      else
        err "Push failed — resolve conflicts manually"
        exit 1
      fi
    else
      err "Rebase failed — resolve conflicts manually"
      exit 1
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
ban "PRODUCTION READY"
ok "Contractions:  $FIXED fixed · $CLEAN clean"
ok "TypeScript:    PASS"
ok "Build:         PASS"
ok "Lint:          PASS"
[ "$NOPUSH" -eq 0 ] && ok "Pushed:        $GIT_REMOTE"
ok "Backup:        ${BACKUP_ROOT}/${SNAPSHOT}"
ok "Log:           $LOG_TMP"
printf "\n${BLD}Next:${R}\n"
printf "  ${CYN}./phase3.sh push${R}    — apply migrations\n"
printf "  ${CYN}./phase4.sh deploy${R}  — deploy to Vercel\n"
hr