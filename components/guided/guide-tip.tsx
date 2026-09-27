import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideTipProps {
  title: string;
  body: string;
  className?: string;
}

/**
 * Inline contextual tip — a soft, non-modal hint rendered next to the
 * relevant UI. The user can keep working; nothing is blocked.
 */
export function GuideTip({ title, body, className }: GuideTipProps) {
  return (
    <aside
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Lightbulb className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-tight">{title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </aside>
  );
}
