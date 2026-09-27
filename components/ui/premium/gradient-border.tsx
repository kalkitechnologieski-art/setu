import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
  /** Tailwind gradient classes, e.g. "from-violet-500 to-blue-500". */
  gradient?: string;
  radius?: "md" | "lg" | "xl" | "2xl";
}

const RADIUS = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
} as const;

export function GradientBorder({
  children,
  className,
  gradient = "from-violet-500 via-indigo-500 to-blue-500",
  radius = "2xl",
}: GradientBorderProps) {
  return (
    <div
      className={cn(
        "relative p-px",
        "bg-gradient-to-br",
        gradient,
        RADIUS[radius],
        className
      )}
    >
      <div className={cn("bg-card", RADIUS[radius])}>{children}</div>
    </div>
  );
}
