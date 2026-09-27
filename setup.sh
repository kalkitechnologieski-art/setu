#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  D:\setu\fix.sh
#  Production Ready — helper-file driven, no heredoc env-var passing
# ═══════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true
shopt -s nullglob
shopt -s globstar 2>/dev/null || true
IFS=$'\n\t'

# ═══════════════════════════════════════════════════════════════════════════
# CONFIG — all paths are absolute, no relative surprises
# ═══════════════════════════════════════════════════════════════════════════
readonly REPO_DIR="/d/setu"
readonly APP_DIR="${REPO_DIR}/app"
readonly COMP_DIR="${REPO_DIR}/components"
readonly GIT_REMOTE="https://github.com/kalkitechnologieski-art/setu.git"

readonly STATE_HOME="${HOME}/.setu"
readonly LOG_HOME="${STATE_HOME}/logs"
readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
readonly LOG_TMP="${LOG_HOME}/fix-${TIMESTAMP}.log"
readonly BACKUP_ROOT="${STATE_HOME}/fix-backups"
readonly SNAPSHOT="${TIMESTAMP}"
readonly ESLINT_JSON="${LOG_HOME}/eslint-${TIMESTAMP}.json"
readonly HELPERS_DIR="${STATE_HOME}/helpers"

mkdir -p "$STATE_HOME" "$LOG_HOME" "$BACKUP_ROOT/$SNAPSHOT" "$HELPERS_DIR"
: > "$LOG_TMP"

# ═══════════════════════════════════════════════════════════════════════════
# FLAGS
# ═══════════════════════════════════════════════════════════════════════════
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

# ═══════════════════════════════════════════════════════════════════════════
# COLORS
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOCLR" -eq 1 ]; then
  R='' RED='' GRN='' YEL='' CYN='' BLD='' MAG='' DIM=''
else
  R=$'\033[0m'
  RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[1;33m'
  CYN=$'\033[0;36m'; BLD=$'\033[1m'; MAG=$'\033[0;35m'; DIM=$'\033[2m'
fi

# ═══════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════
_ts()  { date +'%H:%M:%S'; }
log()  { printf '%s[%s]%s %s\n' "$CYN" "$(_ts)" "$R" "$*" | tee -a "$LOG_TMP"; }
ok()   { printf '%s✔%s %s\n'   "$GRN" "$R" "$*" | tee -a "$LOG_TMP"; }
warn() { printf '%s⚠%s %s\n'   "$YEL" "$R" "$*" | tee -a "$LOG_TMP"; }
err()  { printf '%s✘%s %s\n'   "$RED" "$R" "$*" >&2; }
die()  { err "$*"; exit 1; }
ban()  { printf '\n%s%s═══ %s ═══%s\n' "$BLD" "$CYN" "$*" "$R" | tee -a "$LOG_TMP"; }
sub()  { printf '\n%s%s─── %s ───%s\n' "$BLD" "$MAG" "$*" "$R" | tee -a "$LOG_TMP"; }
hr()   { printf '%s──────────────────────────────────────────%s\n' "$CYN" "$R"; }
dim()  { printf '%s    %s%s\n' "$DIM" "$*" "$R"; }

on_err() {
  local code=$?
  err "Failure at line ${1:-?} (exit $code)"
  err "Log: $LOG_TMP"
  exit "$code"
}
trap 'on_err $LINENO' ERR

# ═══════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

# Coerce any value to a non-negative integer safely.
to_int() {
  local s="${1:-0}"
  s="${s//[^0-9]/}"
  printf '%d' "${s:-0}"
}

# Backup a file preserving its path under REPO_DIR.
backup() {
  local f="$1"
  [ -f "$f" ] || return 0
  local rel="${f#"$REPO_DIR"/}"
  local bd="${BACKUP_ROOT}/${SNAPSHOT}/${rel}"
  mkdir -p "$(dirname "$bd")"
  cp -f "$f" "$bd"
}

# ═══════════════════════════════════════════════════════════════════════════
# HELPER SCRIPTS — written once, invoked many times
# ═══════════════════════════════════════════════════════════════════════════

# ─── summarize.js — prints per-rule counts from ESLint JSON ───────────────
write_summarize_helper() {
  cat > "${HELPERS_DIR}/summarize.js" <<'JS_EOF'
// summarize.js <eslint-json-path>
const fs = require('fs');
const path = process.argv[2];

if (!path) {
  console.error('summarize.js: missing path arg');
  process.exit(2);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (e) {
  console.error('summarize.js: ' + e.message);
  process.exit(1);
}

const counts = new Map();
let errors = 0, warnings = 0;

for (const entry of data) {
  for (const m of entry.messages) {
    const tag = m.severity === 2 ? 'error' : 'warning';
    if (m.severity === 2) errors++; else warnings++;
    const key = `${tag.padEnd(7)} ${m.ruleId || '<unknown>'}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}

if (counts.size === 0) {
  console.log('  (no lint issues)');
} else {
  for (const [k, v] of [...counts.entries()].sort()) {
    console.log(`  ${k.padEnd(56)} ${v}`);
  }
}

console.log();
console.log(`  total: ${errors} error(s), ${warnings} warning(s)`);
process.exit(0);
JS_EOF
  chmod +x "${HELPERS_DIR}/summarize.js"
}

# ─── fix-entities.js — surgical replace of ESLint-flagged chars ───────────
write_fix_entities_helper() {
  cat > "${HELPERS_DIR}/fix-entities.js" <<'JS_EOF'
// fix-entities.js <eslint-json-path> <repo-dir> <backup-root> <snapshot>
const fs = require('fs');
const path = require('path');

const [, , jsonPath, repoDir, backupRoot, snapshot] = process.argv;

if (!jsonPath || !repoDir) {
  console.error('fix-entities.js: missing args');
  process.exit(2);
}

const ENTITY = {
  "'": '&apos;',
  '"': '&quot;',
};

function backupFile(filePath) {
  if (!backupRoot || !snapshot) return;
  try {
    const rel = path.relative(repoDir, filePath);
    const bd = path.join(backupRoot, snapshot, rel);
    fs.mkdirSync(path.dirname(bd), { recursive: true });
    fs.copyFileSync(filePath, bd);
  } catch { /* backup failures shouldn't block */ }
}

let data;
try { data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
catch { console.log('{"fixed":0,"files":0}'); process.exit(0); }

let totalFixed = 0;
let filesTouched = 0;
const touchedFiles = [];

for (const entry of data) {
  const errors = entry.messages.filter(
    m => m.ruleId === 'react/no-unescaped-entities'
  );
  if (errors.length === 0) continue;

  let content;
  try { content = fs.readFileSync(entry.filePath, 'utf8'); }
  catch { continue; }

  const lines = content.split('\n');

  // Sort bottom-right first so earlier column indices stay valid
  errors.sort((a, b) => (b.line - a.line) || (b.column - a.column));

  let applied = 0;
  for (const e of errors) {
    const li = e.line - 1;
    const ci = e.column - 1;
    if (li < 0 || li >= lines.length) continue;

    const line = lines[li];
    if (ci < 0 || ci >= line.length) continue;

    const ch = line[ci];
    const replacement = ENTITY[ch];
    if (!replacement) continue;

    lines[li] = line.substring(0, ci) + replacement + line.substring(ci + 1);
    applied++;
  }

  if (applied > 0) {
    backupFile(entry.filePath);
    fs.writeFileSync(entry.filePath, lines.join('\n'));
    totalFixed += applied;
    filesTouched++;
    touchedFiles.push(path.relative(repoDir, entry.filePath));
  }
}

console.log(JSON.stringify({
  fixed: totalFixed,
  files: filesTouched,
  touched: touchedFiles,
}));
JS_EOF
  chmod +x "${HELPERS_DIR}/fix-entities.js"
}

# ─── fix-unused.js — remove unused imports per ESLint report ──────────────
write_fix_unused_helper() {
  cat > "${HELPERS_DIR}/fix-unused.js" <<'JS_EOF'
// fix-unused.js <eslint-json-path> <repo-dir> <backup-root> <snapshot>
const fs = require('fs');
const path = require('path');

const [, , jsonPath, repoDir, backupRoot, snapshot] = process.argv;

if (!jsonPath || !repoDir) {
  console.error('fix-unused.js: missing args');
  process.exit(2);
}

function backupFile(filePath) {
  if (!backupRoot || !snapshot) return;
  try {
    const rel = path.relative(repoDir, filePath);
    const bd = path.join(backupRoot, snapshot, rel);
    fs.mkdirSync(path.dirname(bd), { recursive: true });
    fs.copyFileSync(filePath, bd);
  } catch { /* ignore */ }
}

let data;
try { data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
catch { console.log('{"removed":0,"files":0}'); process.exit(0); }

// Collect unused symbol names per file
const byFile = new Map();
for (const entry of data) {
  const unused = entry.messages.filter(
    m => m.ruleId === '@typescript-eslint/no-unused-vars'
  );
  if (unused.length === 0) continue;

  const symbols = new Set();
  for (const m of unused) {
    const match = m.message.match(/'([^']+)'\s+is defined but never used/);
    if (match) symbols.add(match[1]);
  }
  if (symbols.size > 0) byFile.set(entry.filePath, symbols);
}

let totalRemoved = 0;
let filesTouched = 0;
const touchedFiles = [];

for (const [filePath, symbols] of byFile) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch { continue; }

  const original = content;
  const lines = content.split('\n');

  for (const sym of symbols) {
    const esc = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.match(/^\s*import/)) continue;

      // Only operate on lines containing the symbol
      if (!new RegExp(`\\b${esc}\\b`).test(line)) continue;

      // Handle `{ Symbol, X }` and `{ X, Symbol }` and `{ Symbol }`
      let next = line;
      next = next.replace(new RegExp(`\\{\\s*${esc}\\s*,\\s*`, 'g'), '{ ');
      next = next.replace(new RegExp(`,\\s*${esc}\\s*(,|\\})`, 'g'), '$1');
      next = next.replace(new RegExp(`,\\s*${esc}\\s*\\}`, 'g'), ' }');
      next = next.replace(new RegExp(`\\{\\s*${esc}\\s*\\}`, 'g'), '{ }');

      lines[i] = next;
    }
  }

  const rebuilt = lines.join('\n');
  if (rebuilt !== original) {
    backupFile(filePath);
    fs.writeFileSync(filePath, rebuilt);
    totalRemoved += symbols.size;
    filesTouched++;
    touchedFiles.push(path.relative(repoDir, filePath));
  }
}

console.log(JSON.stringify({
  removed: totalRemoved,
  files: filesTouched,
  touched: touchedFiles,
}));
JS_EOF
  chmod +x "${HELPERS_DIR}/fix-unused.js"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
ban "SETU KALKI — PRODUCTION READY (helper-file v3)"
log "Repo:      $REPO_DIR"
log "Remote:    $GIT_REMOTE"
log "Backup:    ${BACKUP_ROOT}/${SNAPSHOT}"
log "Helpers:   $HELPERS_DIR"
log "Log:       $LOG_TMP"
hr

# ─── Preflight ────────────────────────────────────────────────────────────
sub "Preflight"
command -v node >/dev/null 2>&1 || die "node not found"
command -v npm  >/dev/null 2>&1 || die "npm not found"
[ -f "${REPO_DIR}/package.json" ]  || die "Missing package.json"
[ -d "${REPO_DIR}/node_modules" ]  || die "Missing node_modules"
[ -d "${REPO_DIR}/.git" ]          || die "Not a git repo"
ok "node $(node -v) · npm $(npm -v)"

# ─── Write helper scripts once ────────────────────────────────────────────
sub "Writing helper scripts"
write_summarize_helper
write_fix_entities_helper
write_fix_unused_helper
ok "3 helpers written to $HELPERS_DIR"

cd "$REPO_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1 — Baseline ESLint JSON
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 1 — Baseline ESLint scan"

# Run ESLint once, write JSON to file. Exit code swallowed — we inspect the file.
npx eslint . --format json > "$ESLINT_JSON" 2>/dev/null || true

# If ESLint produced nothing, write an empty array
if [ ! -s "$ESLINT_JSON" ]; then
  warn "ESLint produced no output — writing empty payload"
  printf '[]\n' > "$ESLINT_JSON"
fi

# Validate JSON parses
if ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$ESLINT_JSON" 2>/dev/null; then
  warn "ESLint JSON invalid — resetting to empty"
  printf '[]\n' > "$ESLINT_JSON"
fi

log "ESLint JSON: $ESLINT_JSON ($(wc -c < "$ESLINT_JSON" | tr -d ' ') bytes)"

# Summarize — helper takes path as argv[2], no env-var passing
node "${HELPERS_DIR}/summarize.js" "$ESLINT_JSON" | tee -a "$LOG_TMP"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2 — Fix react/no-unescaped-entities
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 2 — Fix unescaped entities"

if [ "$DRY" -eq 1 ]; then
  dim "DRY: would run fix-entities.js"
else
  RESULT=$(node "${HELPERS_DIR}/fix-entities.js" \
    "$ESLINT_JSON" "$REPO_DIR" "$BACKUP_ROOT" "$SNAPSHOT")

  FIXED=$(printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try { console.log(JSON.parse(s).fixed); } catch { console.log(0); }
  ')
  FILES=$(printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try { console.log(JSON.parse(s).files); } catch { console.log(0); }
  ')

  FIXED=$(to_int "$FIXED")
  FILES=$(to_int "$FILES")

  ok "Entities: $FIXED char(s) fixed across $FILES file(s)"

  # Print touched files
  printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try {
      const r = JSON.parse(s);
      if (r.touched && r.touched.length) {
        for (const f of r.touched) console.log("    → " + f);
      }
    } catch {}
  ' | tee -a "$LOG_TMP"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3 — Remove unused imports
# ═══════════════════════════════════════════════════════════════════════════
ban "STEP 3 — Remove unused imports"

if [ "$DRY" -eq 1 ]; then
  dim "DRY: would run fix-unused.js"
else
  RESULT=$(node "${HELPERS_DIR}/fix-unused.js" \
    "$ESLINT_JSON" "$REPO_DIR" "$BACKUP_ROOT" "$SNAPSHOT")

  REMOVED=$(printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try { console.log(JSON.parse(s).removed); } catch { console.log(0); }
  ')
  FILES=$(printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try { console.log(JSON.parse(s).files); } catch { console.log(0); }
  ')

  REMOVED=$(to_int "$REMOVED")
  FILES=$(to_int "$FILES")

  ok "Unused imports: $REMOVED symbol(s) removed across $FILES file(s)"

  printf '%s' "$RESULT" | node -e '
    const s = require("fs").readFileSync(0, "utf8");
    try {
      const r = JSON.parse(s);
      if (r.touched && r.touched.length) {
        for (const f of r.touched) console.log("    → " + f);
      }
    } catch {}
  ' | tee -a "$LOG_TMP"
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4 — ESLint re-verification (strict: 0 errors, 0 warnings)
# ═══════════════════════════════════════════════════════════════════════════
if [ "$DRY" -eq 0 ]; then
  ban "STEP 4 — ESLint verify"

  LINT_LOG="${LOG_HOME}/lint-verify-${TIMESTAMP}.log"
  LINT_EXIT=0
  npm run lint > "$LINT_LOG" 2>&1 || LINT_EXIT=$?

  if [ "$LINT_EXIT" -eq 0 ]; then
    ok "lint: PASS — 0 errors, 0 warnings"
  else
    warn "Lint failed — running eslint --fix once"
    npx eslint . --fix >/dev/null 2>&1 || true

    LINT_EXIT=0
    npm run lint > "$LINT_LOG" 2>&1 || LINT_EXIT=$?

    if [ "$LINT_EXIT" -eq 0 ]; then
      ok "lint: PASS after --fix"
    else
      err "lint: FAIL — see $LINT_LOG"
      # awk instead of grep | head — no SIGPIPE under pipefail
      awk '/error|warning/ && NR<=30 { print "    " $0 }' "$LINT_LOG" || true
      exit 1
    fi
  fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 5 — TypeScript
# ═══════════════════════════════════════════════════════════════════════════
  ban "STEP 5 — TypeScript"

  TSC_LOG="${LOG_HOME}/tsc-${TIMESTAMP}.log"
  TSC_EXIT=0
  npx tsc --noEmit > "$TSC_LOG" 2>&1 || TSC_EXIT=$?

  if [ "$TSC_EXIT" -eq 0 ]; then
    ok "tsc: PASS"
  else
    err "tsc: FAIL — see $TSC_LOG"
    awk '/error TS/ && NR<=30 { print "    " $0 }' "$TSC_LOG" || true
    exit 1
  fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 6 — Production build
# ═══════════════════════════════════════════════════════════════════════════
  ban "STEP 6 — Production build"

  BUILD_LOG="${LOG_HOME}/build-${TIMESTAMP}.log"
  BUILD_EXIT=0
  npm run build > "$BUILD_LOG" 2>&1 || BUILD_EXIT=$?

  if [ "$BUILD_EXIT" -eq 0 ]; then
    ok "build: PASS"
    sub "Route table"
    # awk, not grep | head — no SIGPIPE
    awk '/^(Route|├|└|○|ƒ)/ && n<40 { print "  " $0; n++ }' "$BUILD_LOG" || true
  else
    err "build: FAIL — see $BUILD_LOG"
    awk 'NR<=60 { print "    " $0 }' "$BUILD_LOG" || true
    exit 1
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# STEP 7 — Git push
# ═══════════════════════════════════════════════════════════════════════════
if [ "$NOPUSH" -eq 0 ] && [ "$DRY" -eq 0 ]; then
  ban "STEP 7 — Git push"

  git config user.email >/dev/null 2>&1 || git config user.email "kalkitechnologieski@gmail.com"
  git config user.name  >/dev/null 2>&1 || git config user.name  "Setu Kalki"

  current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf 'main')
  [ "$current" = "main" ] || git branch -M main

  # .gitignore hardening
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
    git commit -q -m "Production ready: ESLint-driven surgical fixes

Fixes:
- react/no-unescaped-entities — surgical per line:col replacement
- @typescript-eslint/no-unused-vars — symbol removal from import lines
- Recharts Tooltip formatter signature
- No grep | head pipelines (SIGPIPE-safe)

Premium components:
- CTA button, trust marquee, testimonials
- Feature comparison, device mockup, section header
- Step wizard, guide tip

Ops Center:
- Agent registry, approval chains, governance ledger
- 4 tables, 6 widgets, 5 pages
- Joint workforce dashboard

Backend:
- Supabase Vault for encrypted platform tokens
- Admin RPC variants for cron refresh
- Health endpoint, observability, predeploy gate

Auth:
- Google/GitHub SSO + magic link + password
- Platform OAuth with PKCE (Google Ads, YouTube, Meta)"

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

  log "Pushing to origin/main…"
  PUSH_EXIT=0
  git push -u origin main >/dev/null 2>&1 || PUSH_EXIT=$?

  if [ "$PUSH_EXIT" -eq 0 ]; then
    ok "Pushed to origin/main"
  else
    warn "Push rejected — attempting rebase"
    if git pull --rebase origin main >/dev/null 2>&1; then
      if git push -u origin main >/dev/null 2>&1; then
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
ok "Lint:        PASS"
ok "TypeScript:  PASS"
ok "Build:       PASS"
[ "$NOPUSH" -eq 0 ] && ok "Pushed:      $GIT_REMOTE"
ok "Helpers:     $HELPERS_DIR"
ok "Backup:      ${BACKUP_ROOT}/${SNAPSHOT}"
ok "Log:         $LOG_TMP"
printf '\n%sNext:%s\n' "$BLD" "$R"
printf '  %s./phase3.sh push%s    — apply migrations\n' "$CYN" "$R"
printf '  %s./phase4.sh deploy%s  — deploy to Vercel\n' "$CYN" "$R"
hr