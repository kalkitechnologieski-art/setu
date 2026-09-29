"use client";

// components/notifications/notification-bell.tsx
// ─────────────────────────────────────────────────────────────────────────
// Realtime notification bell with optimistic updates and rollback.
//
// Consumes the withAction-wrapped Server Actions, which return a
// discriminated `ActionResult<T>` union — never throw across the RSC
// boundary. Every mutation runs an optimistic update, then reverts on
// `result.success === false`.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
} from "@/app/actions/notifications";
import {
  KIND_DOT,
  resolveKind,
  type NotificationRow,
} from "@/lib/notifications/types";

interface NotificationBellProps {
  initialItems: NotificationRow[];
  initialUnread: number;
  userId: string;
}

export function NotificationBell({
  initialItems,
  initialUnread,
  userId,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload: { new: unknown }) => {
            if (cancelled) return;
            const row = payload.new as NotificationRow;
            setItems((prev) => [row, ...prev].slice(0, 30));
            setUnread((u) => u + 1);
          }
        )
        .subscribe();

      unsub = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [userId]);

  const markOne = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);

      const target = items.find((i) => i.id === id);
      const wasUnread = target && !target.read_at;
      const now = new Date().toISOString();

      if (wasUnread) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, read_at: now } : i))
        );
        setUnread((u) => Math.max(0, u - 1));
      }

      try {
        const result = await markNotificationRead({ id });

        if (!result.success) {
          if (wasUnread) {
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, read_at: null } : i))
            );
            setUnread((u) => u + 1);
          }
          setError(result.message);
        }
      } catch (e) {
        if (wasUnread) {
          setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, read_at: null } : i))
          );
          setUnread((u) => u + 1);
        }
        setError(e instanceof Error ? e.message : "Failed to mark as read");
      } finally {
        setBusy(false);
      }
    },
    [items]
  );

  const markAll = useCallback(async () => {
    if (unread === 0) return;

    setBusy(true);
    setError(null);

    const snapshotItems = items;
    const snapshotUnread = unread;
    const now = new Date().toISOString();

    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: now }))
    );
    setUnread(0);

    try {
      const result = await markAllNotificationsRead({});

      if (!result.success) {
        setItems(snapshotItems);
        setUnread(snapshotUnread);
        setError(result.message);
      }
    } catch (e) {
      setItems(snapshotItems);
      setUnread(snapshotUnread);
      setError(e instanceof Error ? e.message : "Failed to mark all as read");
    } finally {
      setBusy(false);
    }
  }, [items, unread]);

  const remove = useCallback(
    async (id: string) => {
      setError(null);

      const snapshotItems = items;
      const snapshotUnread = unread;
      const target = items.find((i) => i.id === id);
      const wasUnread = target && !target.read_at;

      setItems((prev) => prev.filter((i) => i.id !== id));
      if (wasUnread) {
        setUnread((u) => Math.max(0, u - 1));
      }

      try {
        const result = await deleteNotification({ id });

        if (!result.success) {
          setItems(snapshotItems);
          setUnread(snapshotUnread);
          setError(result.message);
        }
      } catch (e) {
        setItems(snapshotItems);
        setUnread(snapshotUnread);
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    },
    [items, unread]
  );

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
            {unread > 99 ? "99+" : unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-fade-up rounded-xl border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => void markAll()}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-[11px] text-destructive"
            >
              {error}
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                You&apos;re all caught up.
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  const kind = resolveKind(n.kind);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40",
                        !n.read_at && "bg-primary/[0.03]"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                          KIND_DOT[kind]
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium">
                              {n.title}
                            </div>
                            {n.body && (
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                {n.body}
                              </div>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => void markOne(n.id)}
                              className="text-[10px] font-medium text-primary hover:underline"
                            >
                              Open →
                            </Link>
                          )}
                          {!n.read_at && (
                            <button
                              type="button"
                              onClick={() => void markOne(n.id)}
                              disabled={busy}
                              className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void remove(n.id)}
                            className="ml-auto text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
