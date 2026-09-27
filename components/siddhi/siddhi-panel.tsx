"use client";

import { useEffect, useRef } from "react";
import { Bot, Maximize2, Minimize2, RefreshCw, X } from "lucide-react";
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
      {/* Backdrop for fullscreen mode */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => toggleFullscreen()}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed z-50 flex flex-col border-l bg-background shadow-2xl",
          fullscreen
            ? "inset-4 md:inset-8 rounded-2xl border"
            : "right-0 top-0 h-screen w-[380px] max-w-full md:w-[420px]"
        )}
        role="complementary"
        aria-label="Siddhi assistant"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
              <Bot className="size-3.5" />
            </span>
            <div>
              <div className="text-sm font-semibold leading-tight">Siddhi</div>
              <div className="text-[10px] text-muted-foreground">
                Your marketing assistant
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={reset}
              aria-label="New conversation"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={toggleFullscreen}
              aria-label="Toggle fullscreen"
            >
              {fullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card/40 p-4">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-primary" />
                  <span className="text-sm font-semibold">
                    Hi, I&apos;m Siddhi
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Ask me anything about your leads, campaigns, agents, or
                  performance. I&apos;ll pull real data from your workspace.
                </p>
              </div>
              <SiddhiSuggestions onPick={(text) => void send(text)} />
            </div>
          ) : (
            messages.map((m) => <SiddhiMessage key={m.id} message={m} />)
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                <Bot className="size-3" />
              </span>
              <span>Thinking…</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <SiddhiComposer onSend={(text) => void send(text)} disabled={sending} />
      </aside>
    </>
  );
}
