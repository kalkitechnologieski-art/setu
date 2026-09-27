"use client";

import Link from "next/link";
import { Search, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppTopbar() {
  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "flex h-14 md:h-16 items-center gap-2 md:gap-3",
        "border-b bg-background/70 px-3 md:px-6",
        "backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/50"
      )}
    >
      {/* Mobile brand — replaces sidebar on small screens */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 md:hidden"
        aria-label="Setu Kalki"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </span>
        <span className="text-sm font-semibold tracking-tight gradient-text">
          Setu Kalki
        </span>
      </Link>

      {/* Desktop search — hidden on mobile */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search leads, campaigns, or ask Siddhi…"
          className="h-9 rounded-lg border-border/60 bg-muted/40 pl-9 pr-16 focus-visible:bg-background"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
          ⌘K
        </kbd>
      </div>

      {/* Mobile: compact search icon */}
      <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </Button>
        <ThemeToggle />
        <Link
          href="/dashboard/settings"
          className="ml-0.5 flex items-center gap-2 rounded-full border bg-card/60 p-0.5 pr-2 md:py-1 md:pl-1 md:pr-3 transition-colors hover:bg-accent"
        >
          <Avatar className="size-7 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-semibold text-white">
              SK
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-medium md:inline">Operator</span>
        </Link>
      </div>
    </header>
  );
}

// Local cn import to avoid circular deps
import { cn } from "@/lib/utils";

