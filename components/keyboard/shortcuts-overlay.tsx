"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHORTCUTS, type Shortcut } from "@/lib/keyboard/registry";

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const groups: Array<{ name: string; items: readonly Shortcut[] }> = [
    { name: "Global",     items: SHORTCUTS.filter((s) => s.group === "Global") },
    { name: "Navigation", items: SHORTCUTS.filter((s) => s.group === "Navigation") },
    { name: "Actions",    items: SHORTCUTS.filter((s) => s.group === "Actions") },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg animate-fade-up rounded-2xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            Keyboard shortcuts
          </h2>
          <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
            <X className="size-3.5" />
          </Button>
        </header>

        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <section key={g.name}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.name}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map((s) => (
                  <li
                    key={s.keys}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40"
                  >
                    <span className="text-xs">{s.label}</span>
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
