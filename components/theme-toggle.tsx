"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// ─── Mounted detection via useSyncExternalStore ───────────────────────────
//
// The classic `useEffect(() => setMounted(true), [])` pattern is flagged by
// React 19.2's `react-hooks/set-state-in-effect` rule because it forces a
// second render before paint.
//
// `useSyncExternalStore` is the sanctioned replacement:
//   • getServerSnapshot() returns false during SSR
//   • getSnapshot() returns true once the client is running
//   • No effect, no setState, no cascade
//
// The subscribe function is a no-op because the client-vs-server distinction
// never changes at runtime — React handles the transition once during
// hydration automatically.

const noopSubscribe = (): (() => void) => () => {
  /* never fires — the client/server boundary is stable */
};

const getClientSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? <Sun className="size-4" /> : <Moon className="size-4" />
      ) : (
        <Moon className="size-4 opacity-0" aria-hidden />
      )}
    </Button>
  );
}

