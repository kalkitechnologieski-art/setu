import { cn } from "@/lib/utils";

const LOGOS = [
  "Acme Industries",
  "BrightTech",
  "Nexus AI",
  "Vertex Labs",
  "Solaris Group",
  "Quantum",
  "Helix",
  "Orbital",
];

export function TrustLogos({ className }: { className?: string }) {
  const doubled = [...LOGOS, ...LOGOS];
  return (
    <div
      className={cn(
        "relative flex overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
        className
      )}
    >
      <div
        className="flex shrink-0 items-center gap-12 pr-12"
        style={{ animation: "setu-ticker 40s linear infinite" }}
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="whitespace-nowrap text-sm font-medium tracking-tight text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
