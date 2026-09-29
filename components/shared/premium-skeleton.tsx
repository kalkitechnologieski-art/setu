import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "line" | "card" | "circle" | "table" | "chart";
  rows?: number;
}

export function PremiumSkeleton({ className, variant = "line", rows = 5 }: SkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-9 animate-pulse rounded-lg bg-muted/60" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="flex h-48 items-end gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t bg-muted/40"
              style={{ height: `${30 + ((i * 7) % 60)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return <div className={cn("h-32 animate-pulse rounded-2xl bg-muted/40", className)} />;
  }

  if (variant === "circle") {
    return <div className={cn("h-10 w-10 animate-pulse rounded-full bg-muted/60", className)} />;
  }

  return <div className={cn("h-4 w-full animate-pulse rounded bg-muted/60", className)} />;
}
