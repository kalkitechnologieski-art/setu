import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  agentSlug: string;
  agentName: string;
  action: string;
  status: "success" | "error" | "pending" | "info";
  at: string;
}

const DOT_STYLE = {
  success: "bg-emerald-500",
  error:   "bg-rose-500",
  pending: "bg-amber-500",
  info:    "bg-sky-500",
} as const;

export function LiveActivityFeed({ items }: { items: readonly ActivityItem[] }) {
  return (
    <ol className="relative space-y-2 pl-4">
      <span
        aria-hidden
        className="absolute left-[5px] top-1 bottom-1 w-px bg-gradient-to-b from-border via-border to-transparent"
      />
      {items.map((item) => (
        <li key={item.id} className="relative animate-fade-up">
          <span
            aria-hidden
            className={cn(
              "absolute -left-4 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              DOT_STYLE[item.status]
            )}
          />
          <div className="rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/40">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium">
                {item.agentName}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.at}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {item.action}
            </p>
          </div>
        </li>
      ))}
      {items.length === 0 && (
        <li className="py-6 text-center text-xs text-muted-foreground">
          No activity in this window.
        </li>
      )}
    </ol>
  );
}
