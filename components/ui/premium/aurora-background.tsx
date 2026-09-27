import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  opacity?: number;
}

/**
 * Ambient animated gradient blobs — decorative background layer.
 * Pure CSS keyframes defined in globals.css.
 */
export function AuroraBackground({ className, opacity = 0.6 }: AuroraProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
      style={{ opacity }}
    >
      <div
        className="absolute -left-1/4 top-0 h-[40rem] w-[40rem] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)",
          animation: "setu-aurora 18s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[36rem] w-[36rem] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.28), transparent 70%)",
          animation: "setu-aurora 22s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.22), transparent 70%)",
          animation: "setu-aurora 26s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}
