import { cn } from "@/lib/utils";

export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--hacker-green)] shadow-[0_0_6px_var(--hacker-green)]"
          style={{
            animation: `dot-pulse 1.4s ${i * 0.2}s infinite ease-in-out both`,
          }}
        />
      ))}
    </span>
  );
}
