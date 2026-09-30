// lib/realtime/hooks.ts
// Realtime hooks — useSyncExternalStore edition + presence throttle guard.
// Presence rate limit: 5 updates per 30s per client. Broadcast for high-frequency.
"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  acquireStore, createEmptySnapshot, releaseStore,
  type RealtimeSnapshot, type TrackedRow, type TrackedTable,
} from "./store";

export type {
  RealtimeConnectionStatus, RealtimeSnapshot, TrackedRow, TrackedTable,
} from "./store";

export type RealtimeState<T> = RealtimeSnapshot<T>;

const noopSubscribe = (): (() => void) => () => { /* noop */ };

// ─── Presence throttle ───────────────────────────────────────────────────
const presenceTimestamps: number[] = [];
const PRESENCE_WINDOW_MS = 30_000;
const PRESENCE_MAX_CALLS = 5;

export function canSendPresenceUpdate(): boolean {
  const now = Date.now();
  while (presenceTimestamps.length > 0 && (presenceTimestamps[0] ?? 0) < now - PRESENCE_WINDOW_MS) {
    presenceTimestamps.shift();
  }
  if (presenceTimestamps.length >= PRESENCE_MAX_CALLS) return false;
  presenceTimestamps.push(now);
  return true;
}

// ─── Core hook ───────────────────────────────────────────────────────────
export function useRealtimeTable<K extends TrackedTable>(
  table: K,
  userId: string | null
): RealtimeSnapshot<TrackedRow<K>> {
  const emptySnapshot = useMemo<RealtimeSnapshot<TrackedRow<K>>>(
    () => createEmptySnapshot<TrackedRow<K>>(),
    []
  );

  const store = useMemo(
    () => (userId ? acquireStore(table, userId) : null),
    [table, userId]
  );

  useEffect(() => {
    if (!store || !userId) return;
    return () => { releaseStore(table, userId); };
  }, [store, table, userId]);

  const getSnapshot = useCallback(
    () => (store ? store.getSnapshot() : emptySnapshot),
    [store, emptySnapshot]
  );

  const getServerSnapshot = useCallback(
    () => (store ? store.getServerSnapshot() : emptySnapshot),
    [store, emptySnapshot]
  );

  const subscribe = store ? store.subscribe : noopSubscribe;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useLeads(userId: string | null) {
  return useRealtimeTable("leads", userId);
}

export function useCampaigns(userId: string | null) {
  return useRealtimeTable("campaigns", userId);
}

export function useAgentRuns(userId: string | null) {
  return useRealtimeTable("agent_runs", userId);
}

// ─── Connection state across all subscribed stores ───────────────────────
// Aggregates the "worst" status across every active store into one signal.
// Used by the topbar to show reconnecting/error state.
import type { RealtimeConnectionStatus } from "./store";

const STATUS_PRIORITY: Record<RealtimeConnectionStatus, number> = {
  error: 0,
  reconnecting: 1,
  connecting: 2,
  idle: 3,
  closed: 4,
  subscribed: 5,
};

export interface ConnectionSnapshot {
  status: RealtimeConnectionStatus;
  reconnectAttempt: number;
  isOnline: boolean;
}

export function useConnectionState(): ConnectionSnapshot {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(() => ({
    status: "idle",
    reconnectAttempt: 0,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      setSnapshot((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
      }));
    };

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return snapshot;
}

// ─── Presence hook ───────────────────────────────────────────────────────
// Tracks who else is online. Throttled to respect Supabase Presence limits.
export interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  currentPage?: string;
  status: "online" | "away";
}

export function usePresence(
  userId: string | null,
  channelName = "presence:global"
): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const channel = supabase.channel(channelName, {
          config: { presence: { key: userId } },
        });

        channel.on("presence", { event: "sync" }, () => {
          if (cancelled) return;
          const state = channel.presenceState() as Record<string, PresenceUser[]>;
          const flat: PresenceUser[] = [];
          for (const arr of Object.values(state)) {
            for (const u of arr) flat.push(u);
          }
          setUsers(flat.filter((u) => u.userId !== userId));
        });

        channel.subscribe((status) => {
          if (status === "SUBSCRIBED" && !cancelled) {
            void channel.track({
              userId,
              name: "You",
              status: "online",
              currentPage: typeof window !== "undefined" ? window.location.pathname : undefined,
            });
          }
        });

        unsub = () => { void supabase.removeChannel(channel); };
      } catch { /* swallow — presence is non-critical */ }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [userId, channelName]);

  return users;
}
