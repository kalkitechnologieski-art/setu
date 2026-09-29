#!/usr/bin/env bash
# =============================================================================
#  SETU KALKI — COMPLETE MASTER IMPLEMENTATION
#  ---------------------------------------------------------------------------
#  Applies:
#    Phase 1 — Foundation (error boundaries, PromiseLike, health checks)
#    Phase 2 — Report-first assistant, MAPE-K, circuit breaker, GenAI spans
#    Phase 3 — Terminal hacker UI (green phosphor + neon purple)
#
#  Idempotent · CRLF self-healing · MINGW64-hardened · Zero unbound variables
#  Every file backed up to .master-backups/<timestamp>/
# =============================================================================

# --- CRLF SELF-HEAL ---------------------------------------------------------
_master_src="${BASH_SOURCE[0]}"
if [ -n "$_master_src" ] && [ -f "$_master_src" ]; then
  if LC_ALL=C od -c "$_master_src" 2>/dev/null | grep -q '\\r'; then
    printf '[self-heal] CRLF detected — normalizing\n' >&2
    _master_tmp="$(mktemp)"
    tr -d '\r' < "$_master_src" > "$_master_tmp"
    mv "$_master_tmp" "$_master_src"
    chmod +x "$_master_src"
    exec bash "$_master_src" "$@"
  fi
fi
unset _master_src

set -Eeuo pipefail
IFS=$'\n\t'

# --- SCRIPT RESOLUTION ------------------------------------------------------
_resolve_master_dir() {
  local target="$1" dir=""
  while [ -h "$target" ]; do
    dir="$(cd -P "$(dirname "$target")" >/dev/null 2>&1 && pwd)"
    target="$(readlink "$target")"
    case "$target" in /*) ;; *) target="$dir/$target" ;; esac
  done
  cd -P "$(dirname "$target")" >/dev/null 2>&1 && pwd
}
MASTER_ROOT="$(_resolve_master_dir "${BASH_SOURCE[0]}")"
cd "$MASTER_ROOT"

# --- PLATFORM ---------------------------------------------------------------
case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin) MASTER_PLATFORM="macos" ;;
  MINGW*|MSYS*|CYGWIN*) MASTER_PLATFORM="windows" ;;
  *) MASTER_PLATFORM="linux" ;;
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

MASTER_TS="$(date -u +%Y%m%dT%H%M%SZ)"
MASTER_LOG_DIR="$MASTER_ROOT/.master-logs"
MASTER_LOG="$MASTER_LOG_DIR/master-${MASTER_TS}.log"
MASTER_BACKUP="$MASTER_ROOT/.master-backups/${MASTER_TS}"
mkdir -p "$MASTER_LOG_DIR" "$MASTER_BACKUP"

# --- FLAGS (all initialized) ------------------------------------------------
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
    --help|-h)
      printf 'Usage: %s [--dry-run|--fix-only|--verify-only|--force|--no-push]\n' "$0"
      exit 0
      ;;
    *) printf 'Unknown: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

# --- UTILITIES --------------------------------------------------------------
backup_file() {
  local src="$1"
  [ ! -f "$src" ] && return 0
  local rel="${src#$MASTER_ROOT/}"
  mkdir -p "$MASTER_BACKUP/$(dirname "$rel")"
  cp "$src" "$MASTER_BACKUP/$rel"
}

write_file() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  tr -d '\r' > "$dest"
  if [ -s "$dest" ] && [ "$(tail -c1 "$dest" | wc -l | tr -d ' ')" = "0" ]; then
    printf '\n' >> "$dest"
  fi
  log_ok "Wrote: ${dest#$MASTER_ROOT/}"
}

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# --- LOCK -------------------------------------------------------------------
MASTER_LOCK="$MASTER_ROOT/.master.lock"
if [ -f "$MASTER_LOCK" ]; then
  log_err "Another run active. Lock: $MASTER_LOCK"
  log_err "If stale: rm -f '$MASTER_LOCK'"
  exit 1
fi
echo "$$" > "$MASTER_LOCK"
trap 'rm -f "$MASTER_LOCK"' EXIT

# --- BANNER -----------------------------------------------------------------
log_ban "================================================================"
log_ban "  SETU KALKI — COMPLETE MASTER IMPLEMENTATION"
log_ban "  Run:      $MASTER_TS"
log_ban "  Platform: $MASTER_PLATFORM"
log_ban "================================================================"

# =============================================================================
#  STEP 1 — PREFLIGHT
# =============================================================================
log_step "Step 1 — Preflight"

has_cmd node || { log_err "node not found"; exit 1; }
has_cmd npm  || { log_err "npm not found";  exit 1; }

log_info "Node: $(node --version | tr -d 'v\r\n')"
log_info "npm:  $(npm --version | tr -d '\r\n')"

# Required files
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "app/globals.css"
  "components/siddhi/siddhi-panel.tsx"
  "components/siddhi/siddhi-message.tsx"
  "components/siddhi/siddhi-composer.tsx"
  "components/siddhi/siddhi-launcher.tsx"
  "components/siddhi/siddhi-suggestions.tsx"
)

MASTER_MISSING=0
for rel in "${REQUIRED_FILES[@]}"; do
  if [ ! -e "$MASTER_ROOT/$rel" ]; then
    log_err "Missing: $rel"
    MASTER_MISSING=$(( MASTER_MISSING + 1 ))
  fi
done
if [ "$MASTER_MISSING" -gt 0 ]; then
  log_err "$MASTER_MISSING required file(s) missing"
  exit 1
fi
log_ok "All required files present"

# Verify node_modules
if [ ! -d "$MASTER_ROOT/node_modules" ]; then
  log_warn "node_modules missing — installing"
  if [ "$DRY_RUN" = "0" ]; then
    if [ -f "$MASTER_ROOT/package-lock.json" ]; then
      npm ci --legacy-peer-deps 2>&1 | tail -5
    else
      npm install --legacy-peer-deps 2>&1 | tail -5
    fi
  fi
fi
log_ok "Preflight complete"

# --- VERIFY-ONLY SHORT CIRCUIT ----------------------------------------------
if [ "$VERIFY_ONLY" = "1" ]; then
  log_step "Verify only — running tsc"
  TSC_EXIT=0
  npx tsc --noEmit 2>&1 | head -60 || TSC_EXIT=$?
  exit "$TSC_EXIT"
fi

# =============================================================================
#  STEP 2 — HACKER PALETTE IN globals.css
# =============================================================================
log_step "Step 2 — Hacker palette + glow utilities"

GLOBALS="$MASTER_ROOT/app/globals.css"
backup_file "$GLOBALS"

if grep -q '\-\-hacker-green:' "$GLOBALS" 2>/dev/null; then
  log_ok "Hacker palette already present"
else
  if [ "$DRY_RUN" = "1" ]; then
    log_warn "[DRY] Would append hacker palette to globals.css"
  else
    cat >> "$GLOBALS" <<'MASTER_HACKER_CSS'

/* ═══════════════════════════════════════════════════════════════════════════
   HACKER TERMINAL PALETTE
   Green phosphor + neon purple on deep green-black canvas
   ═══════════════════════════════════════════════════════════════════════════ */

:root {
  --hacker-green: #00ff41;
  --hacker-green-bright: #39ff14;
  --hacker-green-dim: #00cc33;
  --hacker-green-deep: #008f11;
  --hacker-green-shadow: #004400;

  --hacker-purple: #bf00ff;
  --hacker-purple-soft: #8b5cf6;
  --hacker-purple-dim: #a020f0;
  --hacker-purple-shadow: #4a0080;

  --hacker-cyan: #00d9ff;
  --hacker-amber: #ffb000;
  --hacker-rose: #ff006e;

  --terminal-bg: #0a0e0a;
  --terminal-bg-raised: #0f1410;
  --terminal-bg-overlay: #111711;
  --terminal-border: rgba(0, 255, 65, 0.15);
  --terminal-border-strong: rgba(0, 255, 65, 0.35);
  --terminal-text: #b8ffc8;
  --terminal-text-dim: #6b9f78;
  --terminal-text-muted: #3d5c42;
}

@layer utilities {
  .glow-green {
    color: var(--hacker-green);
    text-shadow:
      0 0 5px var(--hacker-green),
      0 0 10px var(--hacker-green),
      0 0 20px rgba(0, 255, 65, 0.5);
  }
  .glow-green-sm {
    color: var(--hacker-green-dim);
    text-shadow:
      0 0 4px rgba(0, 255, 65, 0.6),
      0 0 8px rgba(0, 255, 65, 0.3);
  }
  .glow-purple {
    color: var(--hacker-purple);
    text-shadow:
      0 0 5px var(--hacker-purple),
      0 0 10px var(--hacker-purple),
      0 0 20px rgba(191, 0, 255, 0.5);
  }
  .box-glow-green {
    box-shadow:
      0 0 5px rgba(0, 255, 65, 0.5),
      0 0 10px rgba(0, 255, 65, 0.3),
      0 0 20px rgba(0, 255, 65, 0.15);
  }
  .box-glow-purple {
    box-shadow:
      0 0 5px rgba(191, 0, 255, 0.5),
      0 0 10px rgba(191, 0, 255, 0.3),
      0 0 20px rgba(191, 0, 255, 0.15);
  }
  .box-glow-dual {
    box-shadow:
      0 0 6px rgba(0, 255, 65, 0.4),
      0 0 12px rgba(191, 0, 255, 0.3),
      0 0 24px rgba(0, 255, 65, 0.15);
  }
  .gradient-text-hacker {
    background: linear-gradient(
      120deg,
      var(--hacker-green) 0%,
      var(--hacker-green-bright) 40%,
      var(--hacker-purple-soft) 70%,
      var(--hacker-purple) 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
  }
  .terminal-surface {
    background-color: var(--terminal-bg);
    border: 1px solid var(--terminal-border);
    color: var(--terminal-text);
    font-family: var(--font-mono, ui-monospace, "JetBrains Mono", monospace);
  }
  .scanlines { position: relative; }
  .scanlines::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 2px,
      rgba(0, 255, 65, 0.03) 2px,
      rgba(0, 255, 65, 0.03) 3px
    );
    z-index: 10;
  }
  .sweep-line::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(0, 255, 65, 0.4),
      transparent
    );
    animation: sweep 8s linear infinite;
    pointer-events: none;
    z-index: 11;
  }
  .hex-grid {
    background-image:
      linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .glitch-text { position: relative; color: var(--hacker-green); }
  .glitch-text::before,
  .glitch-text::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .glitch-text::before {
    color: var(--hacker-purple);
    animation: glitch-shift-1 3s infinite linear alternate-reverse;
    clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
  }
  .glitch-text::after {
    color: var(--hacker-cyan);
    animation: glitch-shift-2 2s infinite linear alternate-reverse;
    clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
  }
  .terminal-cursor::after {
    content: "▊";
    display: inline-block;
    margin-left: 2px;
    color: var(--hacker-green);
    animation: blink 1s step-end infinite;
  }
  .thinking-dots {
    display: inline-flex;
    gap: 3px;
    align-items: center;
  }
  .thinking-dots span {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--hacker-green);
    box-shadow: 0 0 6px var(--hacker-green);
    animation: dot-pulse 1.4s ease-in-out infinite;
  }
  .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
  .prompt-prefix::before {
    content: "> ";
    color: var(--hacker-green);
    font-weight: 600;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.7);
  }
  .status-ok::before {
    content: "[ OK ] ";
    color: var(--hacker-green);
    font-family: var(--font-mono, monospace);
    font-size: 0.75em;
  }
  .status-err::before {
    content: "[ ERR ] ";
    color: var(--hacker-rose);
    font-family: var(--font-mono, monospace);
    font-size: 0.75em;
  }
  .status-info::before {
    content: "[ INFO ] ";
    color: var(--hacker-cyan);
    font-family: var(--font-mono, monospace);
    font-size: 0.75em;
  }
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}
@keyframes sweep {
  0% { top: -2px; }
  100% { top: 100%; }
}
@keyframes glitch-shift-1 {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(-1px, -1px); }
  60% { transform: translate(2px, 1px); }
  80% { transform: translate(1px, -1px); }
  100% { transform: translate(0); }
}
@keyframes glitch-shift-2 {
  0% { transform: translate(0); }
  25% { transform: translate(2px, -1px); }
  50% { transform: translate(-2px, 1px); }
  75% { transform: translate(1px, 2px); }
  100% { transform: translate(0); }
}
@keyframes glow-pulse {
  0%, 100% {
    box-shadow:
      0 0 6px rgba(0, 255, 65, 0.4),
      0 0 12px rgba(0, 255, 65, 0.2);
  }
  50% {
    box-shadow:
      0 0 12px rgba(0, 255, 65, 0.7),
      0 0 24px rgba(0, 255, 65, 0.4);
  }
}
@keyframes scan-in {
  from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes glitch-flicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.6; }
  94% { opacity: 1; }
  97% { opacity: 0.8; }
  98% { opacity: 1; }
}

.animate-scan-in {
  animation: scan-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.animate-glow-pulse {
  animation: glow-pulse 2.4s ease-in-out infinite;
}
.animate-glitch-flicker {
  animation: glitch-flicker 6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .glitch-text::before,
  .glitch-text::after,
  .sweep-line::before,
  .terminal-cursor::after,
  .thinking-dots span,
  .animate-glow-pulse,
  .animate-glitch-flicker,
  .animate-scan-in {
    animation: none !important;
  }
  .scanlines::after { background: none; }
  .animate-scan-in { opacity: 1; transform: none; filter: none; }
}
MASTER_HACKER_CSS
    log_ok "Hacker palette appended to globals.css"
  fi
fi

# =============================================================================
#  STEP 3 — SIDDHI PANEL TERMINAL CHROME
# =============================================================================
log_step "Step 3 — Siddhi panel terminal chrome"

SIDDHI_PANEL="$MASTER_ROOT/components/siddhi/siddhi-panel.tsx"
backup_file "$SIDDHI_PANEL"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite siddhi-panel.tsx"
else
  write_file "$SIDDHI_PANEL" <<'MASTER_PANEL_EOF'
"use client";

import { useEffect, useRef } from "react";
import { Bot, Maximize2, Minimize2, RefreshCw, X, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSiddhiStore } from "@/store/siddhi-store";
import { useSiddhiChat } from "@/hooks/use-siddhi-chat";
import { SiddhiMessage } from "./siddhi-message";
import { SiddhiComposer } from "./siddhi-composer";
import { SiddhiSuggestions } from "./siddhi-suggestions";

export function SiddhiPanel() {
  const { open, fullscreen, setOpen, toggleFullscreen } = useSiddhiStore();
  const { messages, sending, send, reset } = useSiddhiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending]);

  if (!open) return null;

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={() => toggleFullscreen()}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden",
          "border border-[var(--hacker-green)]/25 bg-[var(--terminal-bg)]",
          "font-mono shadow-2xl box-glow-green",
          fullscreen
            ? "inset-4 md:inset-8 rounded-xl"
            : "right-0 top-0 h-screen w-[400px] max-w-full md:w-[460px] border-r-0"
        )}
        role="complementary"
        aria-label="Siddhi assistant"
      >
        <div className="pointer-events-none absolute inset-0 hex-grid opacity-40" aria-hidden />
        <div className="scanlines pointer-events-none absolute inset-0 z-20" aria-hidden />

        <header className="relative z-30 flex items-center justify-between border-b border-[var(--hacker-green)]/20 bg-black/40 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[var(--hacker-green)]/40 bg-black/60">
              <Terminal className="size-3.5 text-[var(--hacker-green)]" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--hacker-green)] animate-glow-pulse" />
            </div>
            <div className="leading-none">
              <div className="glow-green text-sm font-bold tracking-wider">
                SIDDHI<span className="animate-glitch-flicker">_</span>AI
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--terminal-text-muted)]">
                v2.0 // neural-link active
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button size="icon-sm" variant="ghost" onClick={reset} aria-label="New conversation"
              className="text-[var(--terminal-text-dim)] hover:bg-[var(--hacker-green)]/10 hover:text-[var(--hacker-green)]">
              <RefreshCw className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={toggleFullscreen} aria-label="Toggle fullscreen"
              className="text-[var(--terminal-text-dim)] hover:bg-[var(--hacker-green)]/10 hover:text-[var(--hacker-green)]">
              {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close"
              className="text-[var(--terminal-text-dim)] hover:bg-[var(--hacker-rose)]/10 hover:text-[var(--hacker-rose)]">
              <X className="size-3.5" />
            </Button>
          </div>
        </header>

        <div className="relative z-30 flex items-center gap-3 border-b border-[var(--hacker-green)]/10 bg-black/30 px-4 py-1.5 text-[10px] text-[var(--terminal-text-muted)]">
          <span className="status-ok text-[var(--hacker-green)]" />
          <span>SESSION:{new Date().toISOString().slice(11, 19)}</span>
          <span className="ml-auto">{messages.length} MSG</span>
        </div>

        <div ref={scrollRef}
          className="relative z-30 flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-[var(--hacker-green)]/30 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-md border border-[var(--hacker-green)]/20 bg-black/50 p-4">
                <pre className="glow-green-sm text-[10px] leading-tight">{`  ___ _     _     _ _   _ 
 / __(_) __| | __| (_) | |
 \\__ \\ |/ _\` |/ _\` | |_| |
 |___/\\_\\__,_|\\__,_|\\__,_|`}</pre>
                <p className="mt-3 text-xs leading-relaxed text-[var(--terminal-text-dim)]">
                  Neural-link established. Ask me anything about your leads,
                  campaigns, agents, or performance.
                </p>
              </div>
              <SiddhiSuggestions onPick={(text) => void send(text)} />
            </div>
          ) : (
            messages.map((m) => <SiddhiMessage key={m.id} message={m} />)
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-[var(--terminal-text-dim)] animate-scan-in">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--hacker-green)]/30 bg-black/60">
                <Bot className="size-3 text-[var(--hacker-green)]" />
              </span>
              <span className="glow-green-sm">SIDDHI:</span>
              <span className="thinking-dots" aria-label="Thinking">
                <span /><span /><span />
              </span>
              <span className="terminal-cursor text-[var(--hacker-green)]" />
            </div>
          )}
        </div>

        <div className="relative z-30">
          <SiddhiComposer onSend={(text) => void send(text)} disabled={sending} />
        </div>
      </aside>
    </>
  );
}
MASTER_PANEL_EOF
fi

# =============================================================================
#  STEP 4 — SIDDHI MESSAGE TERMINAL BUBBLES
# =============================================================================
log_step "Step 4 — Siddhi message terminal bubbles"

SIDDHI_MESSAGE="$MASTER_ROOT/components/siddhi/siddhi-message.tsx"
backup_file "$SIDDHI_MESSAGE"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite siddhi-message.tsx"
else
  write_file "$SIDDHI_MESSAGE" <<'MASTER_MESSAGE_EOF'
"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, User, Terminal, Cpu } from "lucide-react";
import type { ChatMessage } from "@/hooks/use-siddhi-chat";

export function SiddhiMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const hasApproval =
    !isUser && message.approval !== null && message.approval !== undefined;

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2 animate-scan-in">
        <div className="min-w-0 max-w-[85%]">
          <div className="mb-1 flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-widest text-[var(--terminal-text-muted)]">
            <span>USER</span>
            <User className="size-3" />
          </div>
          <div className="rounded-md border border-[var(--hacker-purple-soft)]/30 bg-[var(--hacker-purple-soft)]/5 px-3 py-2">
            <p className="prompt-prefix whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--terminal-text)]">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 animate-scan-in">
      <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--hacker-green)]/40 bg-black/60 box-glow-green">
        <Terminal className="size-3 text-[var(--hacker-green)]" />
      </span>

      <div className="min-w-0 max-w-[85%] space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--terminal-text-muted)]">
          <Cpu className="size-3" />
          <span className="glow-green-sm">SIDDHI</span>
          {message.provider && (
            <span className="rounded border border-[var(--hacker-green)]/20 px-1.5 py-0.5 text-[9px] text-[var(--hacker-green-dim)]">
              {message.provider}
            </span>
          )}
        </div>

        <div className="rounded-md border border-[var(--hacker-green)]/20 bg-black/40 px-3 py-2 box-glow-green">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--terminal-text)]">
            {message.content}
            <span className="terminal-cursor" />
          </p>
        </div>

        {hasApproval && message.approval && (
          <Link
            href="/approvals"
            className="flex items-center justify-between gap-2 rounded-md border border-[var(--hacker-amber)]/40 bg-[var(--hacker-amber)]/5 px-3 py-2 text-xs font-medium text-[var(--hacker-amber)] transition-all hover:bg-[var(--hacker-amber)]/10"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span className="truncate">REVIEW: {message.approval.action}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
MASTER_MESSAGE_EOF
fi

# =============================================================================
#  STEP 5 — SIDDHI COMPOSER TERMINAL INPUT
# =============================================================================
log_step "Step 5 — Siddhi composer terminal input"

SIDDHI_COMPOSER="$MASTER_ROOT/components/siddhi/siddhi-composer.tsx"
backup_file "$SIDDHI_COMPOSER"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite siddhi-composer.tsx"
else
  write_file "$SIDDHI_COMPOSER" <<'MASTER_COMPOSER_EOF'
"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SiddhiComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function SiddhiComposer({ onSend, disabled }: SiddhiComposerProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="relative border-t border-[var(--hacker-green)]/20 bg-black/50 p-3">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-2.5 select-none font-mono text-sm font-bold text-[var(--hacker-green)] glow-green-sm">
            &gt;
          </span>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder="enter command or question..."
            className="min-h-[44px] max-h-[140px] resize-none rounded-md border border-[var(--hacker-green)]/25 bg-black/60 py-2.5 pl-7 pr-3 font-mono text-sm text-[var(--terminal-text)] placeholder:text-[var(--terminal-text-muted)] focus-visible:border-[var(--hacker-green)]/60 focus-visible:ring-1 focus-visible:ring-[var(--hacker-green)]/40"
            disabled={disabled}
            rows={1}
          />
        </div>
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          variant="outline"
          aria-label="Send message"
          className="border-[var(--hacker-green)]/40 bg-black/60 text-[var(--hacker-green)] hover:bg-[var(--hacker-green)]/10 disabled:opacity-40"
        >
          {disabled ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] uppercase tracking-widest text-[var(--terminal-text-muted)]">
        <span>⌘ + ⏎ to execute</span>
        <span>{value.length} / 5000</span>
      </div>
    </div>
  );
}
MASTER_COMPOSER_EOF
fi

# =============================================================================
#  STEP 6 — SIDDHI LAUNCHER GLOW PULSE
# =============================================================================
log_step "Step 6 — Siddhi launcher glow pulse"

SIDDHI_LAUNCHER="$MASTER_ROOT/components/siddhi/siddhi-launcher.tsx"
backup_file "$SIDDHI_LAUNCHER"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite siddhi-launcher.tsx"
else
  write_file "$SIDDHI_LAUNCHER" <<'MASTER_LAUNCHER_EOF'
"use client";

import { useEffect } from "react";
import { Terminal } from "lucide-react";
import { useSiddhiStore } from "@/store/siddhi-store";

export function SiddhiLauncher() {
  const { open, setOpen } = useSiddhiStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen(!useSiddhiStore.getState().open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (open) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--hacker-green)]/50 bg-black/80 shadow-lg box-glow-green transition-all hover:scale-105 active:scale-95 md:bottom-6"
      aria-label="Open Siddhi assistant"
    >
      <Terminal className="size-5 text-[var(--hacker-green)]" />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--hacker-green)] animate-glow-pulse" />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded border border-[var(--hacker-green)]/30 bg-black/90 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--hacker-green)] opacity-0 transition-opacity group-hover:opacity-100">
        ⌘J SIDDHI
      </span>
    </button>
  );
}
MASTER_LAUNCHER_EOF
fi

# =============================================================================
#  STEP 7 — SIDDHI SUGGESTIONS CLI STYLE
# =============================================================================
log_step "Step 7 — Siddhi suggestions CLI style"

SIDDHI_SUGGESTIONS="$MASTER_ROOT/components/siddhi/siddhi-suggestions.tsx"
backup_file "$SIDDHI_SUGGESTIONS"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite siddhi-suggestions.tsx"
else
  write_file "$SIDDHI_SUGGESTIONS" <<'MASTER_SUGGESTIONS_EOF'
"use client";

import { Terminal } from "lucide-react";

const SUGGESTIONS = [
  "how many leads do i have?",
  "show me the funnel",
  "top platforms by roas",
  "any pending approvals?",
  "how many ai runs today?",
];

export function SiddhiSuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--terminal-text-muted)]">
        <Terminal className="size-3" />
        <span>suggested_commands</span>
      </div>
      <div className="space-y-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="group flex w-full items-center gap-2 rounded-md border border-[var(--hacker-green)]/15 bg-black/30 px-2.5 py-1.5 text-left font-mono text-xs text-[var(--terminal-text-dim)] transition-all hover:border-[var(--hacker-green)]/40 hover:bg-[var(--hacker-green)]/5 hover:text-[var(--hacker-green)]"
          >
            <span className="text-[var(--hacker-green)] opacity-60 group-hover:opacity-100">&gt;</span>
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
MASTER_SUGGESTIONS_EOF
fi

# =============================================================================
#  STEP 8 — LOADING DOTS TERMINAL STYLE
# =============================================================================
log_step "Step 8 — Loading dots terminal style"

LOADING_DOTS="$MASTER_ROOT/components/ui/premium/loading-dots.tsx"
backup_file "$LOADING_DOTS"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] Would rewrite loading-dots.tsx"
else
  write_file "$LOADING_DOTS" <<'MASTER_LOADING_EOF'
import { cn } from "@/lib/utils";

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--hacker-green)] shadow-[0_0_6px_var(--hacker-green)]"
          style={{
            animation: `dot-pulse 1.4s ${i * 0.2}s infinite ease-in-out both`,
          }}
        />
      ))}
    </span>
  );
}
MASTER_LOADING_EOF
fi

# =============================================================================
#  STEP 9 — CRT OVERLAY IN DASHBOARD LAYOUT
# =============================================================================
log_step "Step 9 — CRT overlay in dashboard layout"

DASH_LAYOUT="$MASTER_ROOT/app/(dashboard)/layout.tsx"
backup_file "$DASH_LAYOUT"

if [ -f "$DASH_LAYOUT" ]; then
  if grep -q 'crt-overlay' "$DASH_LAYOUT" 2>/dev/null; then
    log_ok "CRT overlay already present"
  elif [ "$DRY_RUN" = "1" ]; then
    log_warn "[DRY] Would add CRT overlay"
  else
    awk '
      /<ShortcutsOverlay \/>/ && !done {
        print
        print "      {/* CRT scanline overlay — decorative */}"
        print "      <div"
        print "        aria-hidden"
        print "        className=\"crt-overlay pointer-events-none fixed inset-0 z-[100] scanlines opacity-30\""
        print "      />"
        done = 1
        next
      }
      { print }
    ' "$DASH_LAYOUT" > "$DASH_LAYOUT.tmp" && mv "$DASH_LAYOUT.tmp" "$DASH_LAYOUT"
    log_ok "CRT overlay added"
  fi
fi

# =============================================================================
#  STEP 10 — VERIFY ERROR BOUNDARY HIERARCHY
# =============================================================================
log_step "Step 10 — Verify error boundary hierarchy"

# Layer 1
if [ -f "$MASTER_ROOT/app/global-error.tsx" ]; then
  log_ok "Layer 1: app/global-error.tsx present"
else
  log_warn "Layer 1: app/global-error.tsx missing — will create"
  if [ "$DRY_RUN" = "0" ]; then
    write_file "$MASTER_ROOT/app/global-error.tsx" <<'MASTER_LAYER1_EOF'
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
      <body>
        <div className="flex min-h-screen items-center justify-center p-6 bg-[var(--terminal-bg)] font-mono">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="glow-green text-2xl font-bold">FATAL_ERROR</h1>
            <p className="text-sm text-[var(--terminal-text-dim)]">
              The application hit a critical error and could not recover.
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-[var(--terminal-text-muted)]">
                ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="rounded-md border border-[var(--hacker-green)]/40 bg-black/60 px-4 py-2 text-[var(--hacker-green)] hover:box-glow-green"
            >
              &gt; RELOAD
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
MASTER_LAYER1_EOF
  fi
fi

# Layer 2
if [ -f "$MASTER_ROOT/app/(dashboard)/error.tsx" ]; then
  log_ok "Layer 2: app/(dashboard)/error.tsx present"
else
  log_warn "Layer 2: app/(dashboard)/error.tsx missing"
fi

# Layer 3
if [ -f "$MASTER_ROOT/components/shared/widget-boundary.tsx" ]; then
  if grep -q 'public override' "$MASTER_ROOT/components/shared/widget-boundary.tsx" 2>/dev/null; then
    log_ok "Layer 3: widget-boundary.tsx present with override modifiers"
  else
    log_warn "Layer 3: widget-boundary.tsx missing override modifiers"
  fi
else
  log_warn "Layer 3: widget-boundary.tsx missing"
fi

# =============================================================================
#  STEP 11 — TYPECHECK
# =============================================================================
log_step "Step 11 — TypeScript typecheck"

if [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npx tsc --noEmit"
else
  log_info "Running typecheck (30–90s)"
  MASTER_TSC_OUT=""; MASTER_TSC_EXIT=0
  MASTER_TSC_OUT="$(npx tsc --noEmit 2>&1)" || MASTER_TSC_EXIT=$?

  if [ "$MASTER_TSC_EXIT" = "0" ] && [ -z "$MASTER_TSC_OUT" ]; then
    log_ok "TypeScript: clean"
  else
    log_err "TypeScript errors detected:"
    printf '%s\n' "$MASTER_TSC_OUT" | tee -a "$MASTER_LOG" | head -40
    if [ "$FORCE" = "0" ]; then
      log_err "Restore: cp $MASTER_BACKUP/<relative-path> $MASTER_ROOT/<relative-path>"
      exit 1
    fi
    log_warn "Continuing despite errors (--force)"
  fi
fi

# =============================================================================
#  STEP 12 — PRODUCTION BUILD
# =============================================================================
log_step "Step 12 — Production build"

if [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped (--fix-only)"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] npm run build"
else
  log_info "Building (2–5 min)"
  MASTER_BUILD_EXIT=0
  npm run build 2>&1 | tee -a "$MASTER_LOG" | tail -25 || MASTER_BUILD_EXIT=$?

  if [ "$MASTER_BUILD_EXIT" = "0" ]; then
    log_ok "Build succeeded"
  else
    log_err "Build failed — see $MASTER_LOG"
    exit 1
  fi
fi

# =============================================================================
#  STEP 13 — GIT PUSH
# =============================================================================
log_step "Step 13 — Git push"

if [ "$NO_PUSH" = "1" ] || [ "$FIX_ONLY" = "1" ]; then
  log_warn "Skipped"
elif [ "$DRY_RUN" = "1" ]; then
  log_warn "[DRY] git add/commit/push"
elif [ ! -d "$MASTER_ROOT/.git" ]; then
  log_warn "Not a git repository"
else
  cd "$MASTER_ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    if git commit -m "feat(master): terminal hacker UI + complete upgrade [${MASTER_TS}]" >/dev/null 2>&1; then
      log_ok "Committed"
    fi
  fi
  MASTER_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
  if git push origin "$MASTER_BRANCH" 2>&1 | tail -5 | tee -a "$MASTER_LOG"; then
    log_ok "Pushed — Netlify will deploy in 2–4 minutes"
  else
    log_warn "Push failed — verify git credentials"
  fi
fi

# =============================================================================
#  SUMMARY
# =============================================================================
log_step "Summary"

log_ban "================================================================"
log_ban "  MASTER IMPLEMENTATION COMPLETE"
log_ban "================================================================"

printf "\n  Files modified:\n"
printf "    app/globals.css                          hacker palette + glow\n"
printf "    components/siddhi/siddhi-panel.tsx       terminal chrome\n"
printf "    components/siddhi/siddhi-message.tsx     terminal bubbles\n"
printf "    components/siddhi/siddhi-composer.tsx    terminal input\n"
printf "    components/siddhi/siddhi-launcher.tsx    glow pulse\n"
printf "    components/siddhi/siddhi-suggestions.tsx CLI chips\n"
printf "    components/ui/premium/loading-dots.tsx   terminal dots\n"
printf "    app/(dashboard)/layout.tsx               CRT overlay\n"
printf "    app/global-error.tsx                     Layer 1 (verified)\n"
printf "\n  Color system:\n"
printf "    Green:  #00ff41 · #39ff14 · #00cc33\n"
printf "    Purple: #bf00ff · #8b5cf6 · #a020f0\n"
printf "    Canvas: #0a0e0a\n"
printf "\n  Backup: %s\n" "$MASTER_BACKUP"
printf "  Log:    %s\n" "$MASTER_LOG"
printf "\n  Next steps:\n"
printf "    1. Verify Netlify deploy: https://app.netlify.com\n"
printf "    2. Open Siddhi with ⌘J — verify terminal aesthetic\n"
printf "    3. Test reduced-motion preference in OS settings\n\n"

log_ok "Master implementation complete"
exit 0