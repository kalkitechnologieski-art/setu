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
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask Siddhi anything…"
        className="min-h-[40px] max-h-[140px] resize-none text-sm"
        disabled={disabled}
        rows={1}
      />
      <Button
        onClick={submit}
        disabled={disabled || !value.trim()}
        size="icon"
        variant="gradient"
        aria-label="Send message"
      >
        {disabled ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowUp className="size-4" />
        )}
      </Button>
    </div>
  );
}
