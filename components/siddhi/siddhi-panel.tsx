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
