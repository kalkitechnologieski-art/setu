"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:w-[260px] md:shrink-0",
        "border-r bg-card/40 backdrop-blur-xl"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-md">
          <Sparkles className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse-ring" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight gradient-text">
            Setu Kalki
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Intelligence OS
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-500 to-blue-500" />
              )}
              <Icon
                className={cn(
                  "size-4 transition-transform",
                  active ? "scale-110" : "group-hover:scale-105"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge
                  variant="secondary"
                  className="h-5 rounded-full px-2 text-[10px] font-semibold"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade card */}
      <div className="p-3">
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent p-4">
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">Pro tip</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ask Siddhi to audit your campaigns in one sentence.
            </p>
            <Link
              href="/dashboard/performance"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open performance →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

