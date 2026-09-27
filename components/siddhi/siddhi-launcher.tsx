"use client";

import { useEffect } from "react";
import { Bot } from "lucide-react";
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
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      aria-label="Open Siddhi assistant"
    >
      <Bot className="size-5" />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
    </button>
  );
}
