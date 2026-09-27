"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ApprovalCardProps {
  approvalId?: string;
  agentName: string;
  action: string;
  summary: string;
  reasoning?: string;
  confidence?: number;
  accent?: string;
  onApprove?: (id: string) => Promise<void> | void;
  onReject?: (id: string) => Promise<void> | void;
}

export function ApprovalCard({
  approvalId,
  agentName,
  action,
  summary,
  reasoning,
  confidence,
  accent = "from-violet-500 to-indigo-500",
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [isPending, startTransition] = useTransition();
  const [localState, setLocalState] = useState<
    "idle" | "approved" | "rejected"
  >("idle");

  function handleApprove() {
    if (!approvalId || !onApprove) {
      setLocalState("approved");
      return;
    }
    startTransition(async () => {
      try {
        await onApprove(approvalId);
        setLocalState("approved");
      } catch {
        setLocalState("idle");
      }
    });
  }

  function handleReject() {
    if (!approvalId || !onReject) {
      setLocalState("rejected");
      return;
    }
    startTransition(async () => {
      try {
        await onReject(approvalId);
        setLocalState("rejected");
      } catch {
        setLocalState("idle");
      }
    });
  }

  const resolved = localState !== "idle";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:shadow-md",
        resolved && "opacity-60"
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white",
              accent
            )}
          >
            {agentName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">{action}</div>
            <div className="truncate text-xs text-muted-foreground">
              by {agentName}
            </div>
          </div>
        </div>
        {typeof confidence === "number" && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </header>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {summary}
      </p>

      {reasoning && (
        <details className="mt-2">
          <summary className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Sparkles className="size-3" />
            Show reasoning
          </summary>
          <p className="mt-1.5 rounded-lg bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
            {reasoning}
          </p>
        </details>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          variant="gradient"
          className="flex-1"
          disabled={isPending || resolved}
          onClick={handleApprove}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {localState === "approved" ? "Approved" : "Approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={isPending || resolved}
          onClick={handleReject}
        >
          <X className="size-4" />
          {localState === "rejected" ? "Rejected" : "Reject"}
        </Button>
      </div>
    </article>
  );
}
