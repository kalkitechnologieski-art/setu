import { cn } from "@/lib/utils";

interface TickerProps {
  items: readonly string[];
  className?: string;
  speedSeconds?: number;
}

/**
 * Infinite horizontal marquee. Duplicates the items twice and translates
 * by -50% so the loop is seamless.
 */
export function Ticker({ items, className, speedSeconds = 30 }: TickerProps) {
  const doubled = [...items, ...items];

  return (
    <div
      className={cn(
        "relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className
      )}
    >
      <div
        className="flex shrink-0 items-center gap-8 pr-8"
        style={{
          animation: `setu-ticker ${speedSeconds}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-xs uppercase tracking-wider text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
