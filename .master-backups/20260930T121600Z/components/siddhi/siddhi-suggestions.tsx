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
