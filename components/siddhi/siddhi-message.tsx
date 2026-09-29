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
