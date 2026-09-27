import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps {
  className?: string;
  /** Tailwind width/height utilities, e.g. "h-4 w-24". */
  variant?: "line" | "card" | "circle" | "block";
}

export function ShimmerSkeleton({
  className,
  variant = "line",
}: ShimmerSkeletonProps) {
  const base = cn(
    "relative overflow-hidden rounded-md bg-muted/60",
    "before:absolute before:inset-0 before:-translate-x-full",
    "before:bg-gradient-to-r before:from-transparent",
    "before:via-white/20 before:to-transparent",
    "before:animate-[setu-shimmer_1.6s_infinite]",
    "dark:before:via-white/5",
    variant === "line" && "h-4 w-full",
    variant === "card" && "h-32 w-full rounded-2xl",
    variant === "circle" && "h-10 w-10 rounded-full",
    variant === "block" && "h-6 w-full",
    className
  );
  return <div className={base} aria-hidden />;
}
