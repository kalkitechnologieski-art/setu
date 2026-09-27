import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Disable inner padding (for tables/full-bleed content). */
  bare?: boolean;
}

/**
 * App-like card primitive. Rounded 2xl, subtle border, hover glow.
 * Same visual on mobile and desktop — the difference is grid columns,
 * not card appearance.
 */
export function Widget({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bare = false,
}: WidgetProps) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card",
        "shadow-sm transition-shadow hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      {(title || action) && (
        <header
          className={cn(
            "flex flex-wrap items-center justify-between gap-3",
            bare ? "px-5 pt-5" : "p-5 pb-0"
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-blue-500/10 text-violet-600 dark:text-violet-400">
                <Icon className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="truncate text-sm font-semibold tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(bare ? "" : "p-5", title && !bare && "pt-4")}>
        {children}
      </div>
    </section>
  );
}

