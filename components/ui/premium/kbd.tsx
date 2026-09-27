import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 select-none items-center gap-0.5 rounded border",
        "bg-muted/60 px-1.5 font-mono text-[10px] font-medium",
        "text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
