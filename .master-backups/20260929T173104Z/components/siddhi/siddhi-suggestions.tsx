"use client";

import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "How many leads do I have?",
  "What's my funnel look like?",
  "Show me my top platforms",
  "Any pending approvals?",
  "How many AI runs today?",
];

export function SiddhiSuggestions({
  onPick,
}: {
  onPick: (text: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3" />
        Try asking
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
