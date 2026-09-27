"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/use-siddhi-chat";

export function SiddhiMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex items-start gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
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
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
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
    </div>
  );
}
