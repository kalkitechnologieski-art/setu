"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, isActivePath } from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "md:hidden",                                        // hide on desktop
        "fixed inset-x-0 bottom-0 z-40",
        "border-t bg-background/80 backdrop-blur-2xl",
        "supports-[backdrop-filter]:bg-background/60",
        "pb-[env(safe-area-inset-bottom)]",                 // iPhone home indicator
        "shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)]"
      )}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(item.href, pathname);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1",
                  "min-h-[44px] min-w-[44px]",                // WCAG tap target
                  "transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
                )}
                <span className="relative">
                  <Icon className={cn("size-5 transition-transform", active && "scale-110")} />
                  {item.badge && (
                    <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </span>
                <span className={cn(
                  "text-[10px] font-medium tracking-tight",
                  active && "font-semibold"
                )}>
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

