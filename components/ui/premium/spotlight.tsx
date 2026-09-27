"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  children: ReactNode;
  className?: string;
  /** Radius in pixels of the spotlight glow. */
  size?: number;
  /** Color of the glow. */
  color?: string;
}

/**
 * Container that renders a mouse-following radial gradient.
 * Uses direct DOM style writes via refs — no React state, no effect churn.
 */
export function Spotlight({
  children,
  className,
  size = 260,
  color = "rgba(139,92,246,0.15)",
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot-x", "-9999px");
    el.style.setProperty("--spot-y", "-9999px");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "group/spot relative overflow-hidden rounded-2xl",
        "before:pointer-events-none before:absolute before:inset-0",
        "before:opacity-0 before:transition-opacity before:duration-300",
        "hover:before:opacity-100",
        className
      )}
      style={{
        // @ts-expect-error custom properties are valid
        "--spot-size": `${size}px`,
        "--spot-color": color,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(var(--spot-size) circle at var(--spot-x, -9999px) var(--spot-y, -9999px), var(--spot-color), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
