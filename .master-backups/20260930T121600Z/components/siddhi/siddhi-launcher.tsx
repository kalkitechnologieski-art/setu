"use client";

import { useEffect } from "react";
import { Terminal } from "lucide-react";
import { useSiddhiStore } from "@/store/siddhi-store";

export function SiddhiLauncher() {
  const { open, setOpen } = useSiddhiStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen(!useSiddhiStore.getState().open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (open) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--hacker-green)]/50 bg-black/80 shadow-lg box-glow-green transition-all hover:scale-105 active:scale-95 md:bottom-6"
      aria-label="Open Siddhi assistant"
    >
      <Terminal className="size-5 text-[var(--hacker-green)]" />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--hacker-green)] animate-glow-pulse" />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded border border-[var(--hacker-green)]/30 bg-black/90 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--hacker-green)] opacity-0 transition-opacity group-hover:opacity-100">
        ⌘J SIDDHI
      </span>
    </button>
  );
}
