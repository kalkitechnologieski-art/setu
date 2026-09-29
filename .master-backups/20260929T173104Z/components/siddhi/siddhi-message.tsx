"use client";

import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-siddhi-chat";

export function SiddhiMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const hasApproval =
    !isUser && message.approval !== null && message.approval !== undefined;

  return (
    <div className={cn("flex items-start gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          isUser
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-to-br from-violet-500 to-blue-500 text-white"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>

      <div className="min-w-0 max-w-[85%] space-y-2">
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {!isUser && message.provider && (
            <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              via {message.provider}
            </p>
          )}
        </div>

        {hasApproval && message.approval && (
          <Link
            href="/approvals"
            className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span className="truncate">Review: {message.approval.action}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
