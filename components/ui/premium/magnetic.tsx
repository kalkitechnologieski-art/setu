"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Max translation in pixels. */
  strength?: number;
}

/**
 * Element that pulls toward the cursor on hover. Returns to center on leave.
 * Uses refs + direct transform writes — zero re-renders.
 */
export function Magnetic({
  children,
  className,
  strength = 12,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const sx = (x / rect.width) * strength;
    const sy = (y / rect.height) * strength;
    el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate3d(0,0,0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "inline-block transition-transform duration-300 ease-out",
        "will-change-transform",
        className
      )}
    >
      {children}
    </div>
  );
}
