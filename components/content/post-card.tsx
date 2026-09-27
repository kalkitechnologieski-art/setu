"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updatePostStatus, deletePost } from "@/app/actions/content";
import {
  PLATFORMS,
  STATUS_LABEL,
  STATUS_STYLE,
  type ContentPost,
  type ContentStatus,
} from "@/lib/content/types";

export function PostCard({ post }: { post: ContentPost }) {
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<ContentPost>(post);

  const platformMetas = PLATFORMS.filter((p) =>
    current.platforms.includes(p.slug)
  );
  const status = current.status as ContentStatus;

  function changeStatus(next: ContentStatus, reason?: string) {
    startTransition(async () => {
      const result = await updatePostStatus({
        id: current.id,
        status: next,
        rejection_reason: reason,
      });
      if (result.ok) setCurrent(result.data);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deletePost({ id: current.id });
      if (result.ok) {
        setCurrent({ ...current, status: "rejected" });
      }
    });
  }

  const scheduled = current.scheduled_for
    ? new Date(current.scheduled_for).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:shadow-primary/5">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {platformMetas.map((p) => (
            <span
              key={p.slug}
              className={cn(
                "rounded-md bg-gradient-to-br px-2 py-0.5 text-[10px] font-semibold text-white",
                p.gradient
              )}
            >
              {p.short}
            </span>
          ))}
        </div>
        <Badge className={cn("rounded-full border-0 text-[10px]", STATUS_STYLE[status])}>
          {STATUS_LABEL[status]}
        </Badge>
      </header>

      <div className="min-w-0">
        {current.title && (
          <h3 className="truncate text-sm font-semibold tracking-tight">
            {current.title}
          </h3>
        )}
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {current.body}
        </p>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{scheduled}</span>
        {current.rejection_reason && (
          <span className="text-rose-500">{current.rejection_reason}</span>
        )}
      </div>

      <footer className="flex items-center gap-1.5 border-t pt-3">
        {status === "draft" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => changeStatus("scheduled")}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Schedule"}
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => changeStatus("published")}
              disabled={isPending}
              className="flex-1"
            >
              <Check className="size-3.5" /> Publish
            </Button>
          </>
        )}
        {status === "pending_approval" && (
          <>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => changeStatus("scheduled")}
              disabled={isPending}
              className="flex-1"
            >
              <Check className="size-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => changeStatus("rejected", "Rejected by reviewer")}
              disabled={isPending}
              className="flex-1"
            >
              <X className="size-3.5" /> Reject
            </Button>
          </>
        )}
        {status === "scheduled" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeStatus("draft")}
            disabled={isPending}
            className="flex-1"
          >
            Move to draft
          </Button>
        )}
        {(status === "published" || status === "rejected" || status === "failed") && (
          <Button
            size="sm"
            variant="outline"
            onClick={remove}
            disabled={isPending}
            className="flex-1 text-muted-foreground"
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        )}
      </footer>
    </article>
  );
}
