import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CtaButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
  className?: string;
}

export function CtaButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  className,
}: CtaButtonProps) {
  const base = cn(
    "group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl font-medium tracking-tight transition-all",
    "active:scale-[0.98]",
    size === "lg" ? "h-12 px-6 text-base" : "h-10 px-5 text-sm",
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40"
      : "border bg-card text-foreground hover:bg-accent"
  );

  return (
    <Link href={href} className={cn(base, className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative">{children}</span>
      <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
