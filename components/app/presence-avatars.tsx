"use client";

// components/app/presence-avatars.tsx
// Avatar stack showing who else is online. Click to see full list.
import { useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  currentPage?: string;
}

interface PresenceAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
  className?: string;
}

export function PresenceAvatars({
  users,
  maxVisible = 3,
  className,
}: PresenceAvatarsProps) {
  const [open, setOpen] = useState(false);

  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - visible.length;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center -space-x-2 rounded-full border border-[var(--hacker-green)]/20 bg-black/40 px-2 py-1 transition-all hover:border-[var(--hacker-green)]/40"
        aria-label={`${users.length} other${users.length === 1 ? "" : "s"} online`}
      >
        {visible.map((u) => (
          <span
            key={u.userId}
            className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[var(--hacker-green)]/40 bg-black/80 text-[10px] font-semibold text-[var(--hacker-green)]"
            title={u.name}
          >
            {u.name.slice(0, 2).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--hacker-green)] ring-2 ring-black animate-glow-pulse" />
          </span>
        ))}
        {overflow > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--hacker-green)]/40 bg-black/80 text-[10px] font-semibold text-[var(--hacker-green-dim)]">
            +{overflow}
          </span>
        )}
        <Users className="ml-1 size-3 text-[var(--terminal-text-dim)] group-hover:text-[var(--hacker-green)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-[var(--hacker-green)]/30 bg-black/95 p-2 font-mono shadow-lg">
          <div className="mb-1.5 flex items-center gap-1.5 border-b border-[var(--hacker-green)]/20 pb-1.5 text-[9px] uppercase tracking-widest text-[var(--terminal-text-muted)]">
            <Users className="size-3" />
            <span>online_now</span>
          </div>
          <ul className="space-y-1">
            {users.map((u) => (
              <li
                key={u.userId}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[var(--terminal-text)] hover:bg-[var(--hacker-green)]/5"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--hacker-green)] shadow-[0_0_4px_var(--hacker-green)]" />
                <span className="truncate">{u.name}</span>
                {u.currentPage && (
                  <span className="ml-auto truncate text-[10px] text-[var(--terminal-text-muted)]">
                    {u.currentPage}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
