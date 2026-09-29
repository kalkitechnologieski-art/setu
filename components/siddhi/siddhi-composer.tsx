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
