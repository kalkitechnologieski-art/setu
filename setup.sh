#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — ONE-SHOT PUSH WITH PAT
#  =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

R="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$R"

ok()   { printf '\033[0;32m[OK]\033[0m   %s\n' "$1"; }
info() { printf '\033[0;36m[INFO]\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$1"; }
err()  { printf '\033[0;31m[ERR]\033[0m  %s\n' "$1" >&2; }

OWNER="kalkitechnologieski-art"
REPO="setu"
USER="kalkitechnologieski-art"
TOKEN="${GITHUB_TOKEN:-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}"
BRANCH="main"

# ── 1. Verify we're in a git repo ────────────────────────────────────────
if [ ! -d "$R/.git" ]; then
  err "Not a git repository: $R"
  exit 1
fi
ok "Git repo detected"

# ── 2. Check for uncommitted changes ─────────────────────────────────────
if [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes detected — committing"
  git add -A
  git commit -m "chore: pre-push sync" >/dev/null 2>&1 || true
  ok "Committed local changes"
else
  ok "Working tree clean"
fi

# ── 3. Show last local commit ────────────────────────────────────────────
LAST="$(git log -1 --oneline 2>/dev/null || echo '(none)')"
info "Last local commit: $LAST"

# ── 4. Clear wrong cached credentials ────────────────────────────────────
info "Clearing cached GitHub credentials"
cmd.exe /c "cmdkey /delete:git:https://github.com" >/dev/null 2>&1 || true
cmd.exe /c "cmdkey /delete:LegacyGeneric:target=git:https://github.com" >/dev/null 2>&1 || true
ok "Cached credentials cleared"

# ── 5. Set remote URL with token ─────────────────────────────────────────
info "Setting remote with token"
git remote set-url origin "https://${USER}:${TOKEN}@github.com/${OWNER}/${REPO}.git"
ok "Remote updated"

# ── 6. Push ──────────────────────────────────────────────────────────────
info "Pushing to origin/${BRANCH}"
if git push origin "$BRANCH" 2>&1 | tail -8; then
  ok "Push succeeded"
  PUSH_OK=1
else
  err "Push failed"
  PUSH_OK=0
fi

# ── 7. Clean up — remove token from remote URL ───────────────────────────
info "Removing token from remote URL"
git remote set-url origin "https://github.com/${OWNER}/${REPO}.git"
ok "Remote URL restored to tokenless form"

# ── 8. Verify ────────────────────────────────────────────────────────────
info "Remote: $(git remote get-url origin)"

if [ "${PUSH_OK:-0}" = "1" ]; then
  info "Remote HEAD: $(git log origin/${BRANCH} -1 --oneline 2>/dev/null || echo 'unknown')"
  printf '\n\033[0;32m=== PUSH COMPLETE ===\033[0m\n\n'
  printf '\033[1;33mSECURITY — do this now:\033[0m\n'
  printf '  1. Visit https://github.com/settings/tokens (as kalkitechnologieski-art)\n'
  printf '  2. Delete the token starting with ghp_nwSOdB90...\n'
  printf '  3. Generate a new one if needed — never paste it in chat again\n\n'
  printf '\033[0;36mNetlify deploy triggered. Monitor at https://app.netlify.com\033[0m\n\n'
  exit 0
else
  printf '\n\033[0;31m=== PUSH FAILED ===\033[0m\n\n'
  printf 'Try these steps:\n'
  printf '  1. Verify the token is still valid at https://github.com/settings/tokens\n'
  printf '  2. Confirm the repo exists: https://github.com/%s/%s\n' "$OWNER" "$REPO"
  printf '  3. Check branch: git branch --show-current\n\n'
  exit 1
fi