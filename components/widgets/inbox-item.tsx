import { Mail, MessageSquare, Phone, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InboxChannel = "email" | "call" | "signal" | "approval";

interface InboxItemProps {
  channel: InboxChannel;
  sender: string;
  summary: string;
  timestamp: string;
  confidence?: number;
  active?: boolean;
}

const CHANNEL_ICON: Record<InboxChannel, typeof Mail> = {
  email: Mail,
  call: Phone,
  signal: Zap,
  approval: MessageSquare,
};

const CHANNEL_COLOR: Record<InboxChannel, string> = {
  email: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  call: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  signal: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approval: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export function InboxItem({
  channel,
  sender,
  summary,
  timestamp,
  confidence,
  active,
}: InboxItemProps) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            CHANNEL_COLOR[channel]
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{sender}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {timestamp}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {summary}
          </p>
          {typeof confidence === "number" && (
            <Badge variant="outline" className="mt-1.5 h-5 text-[10px] tabular-nums">
              {Math.round(confidence * 100)}% confident
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
