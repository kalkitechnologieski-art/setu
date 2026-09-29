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
