"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThemeStore } from "@/lib/theme/store";

export function ThemeToggle() {
  const store = getThemeStore();

  const resolved = useSyncExternalStore(
    store.subscribe,
    store.getResolvedSnapshot,
    store.getServerResolvedSnapshot
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => store.toggle()}
      suppressHydrationWarning
    >
      {resolved === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
