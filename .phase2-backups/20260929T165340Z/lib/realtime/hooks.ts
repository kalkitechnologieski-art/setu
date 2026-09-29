// lib/realtime/hooks.ts
// ═══════════════════════════════════════════════════════════════════════════
// Realtime hooks — useSyncExternalStore edition.
//
// SINGLE SOURCE OF TRUTH:
//   Every snapshot in this file comes from createEmptySnapshot<T>() exported
//   by lib/realtime/store.ts. There are no hand-written snapshot literals
//   here, so future interface additions cannot cause TS2739 drift.
//
// STABILITY:
//   The three functions passed to useSyncExternalStore are memoized with
//   useCallback so their identities don't change between renders. This
//   prevents React from re-subscribing on every commit.
//
// SSR SAFETY:
//   getServerSnapshot returns an empty snapshot with loading: false, which
//   exactly matches the store's initial snapshot — no hydration mismatch.
// ═══════════════════════════════════════════════════════════════════════════
"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  acquireStore,
  createEmptySnapshot,
  releaseStore,
  type RealtimeSnapshot,
  type TrackedRow,
  type TrackedTable,
} from "./store";

// Re-export the public types so existing imports keep working.
export type {
  RealtimeConnectionStatus,
  RealtimeSnapshot,
  TrackedRow,
  TrackedTable,
} from "./store";

/** Backwards-compatible alias. */
export type RealtimeState<T> = RealtimeSnapshot<T>;

// ─── Stable fallbacks (module-scope, no allocation per render) ────────────

const noopSubscribe = (): (() => void) => () => {
  /* no-op: no external source to subscribe to */
};

// ─── Core hook ────────────────────────────────────────────────────────────

/**
 * Subscribe to a Supabase table's Realtime changes for the given user.
 *
 * Returns a stable snapshot with `{data, loading, error, status,
 * reconnectAttempt}`. When `userId` is null, an empty snapshot is returned
 * and no channel is opened.
 */
export function useRealtimeTable<K extends TrackedTable>(
  table: K,
  userId: string | null
): RealtimeSnapshot<TrackedRow<K>> {
  // Stable empty snapshot for the null-user case — the same object is
  // returned on every render so React never sees a spurious change.
  const emptySnapshot = useMemo<RealtimeSnapshot<TrackedRow<K>>>(
    () => createEmptySnapshot<TrackedRow<K>>(),
    []
  );

  // Acquire the singleton store for this (table, userId). Stable across
  // renders as long as those two inputs don't change.
  const store = useMemo(
    () => (userId ? acquireStore(table, userId) : null),
    [table, userId]
  );

  // Release on unmount or when the key changes. The store schedules its
  // own disposal after the grace window so a Strict-Mode remount reuses
  // the same channel.
  useEffect(() => {
    if (!store || !userId) return;
    return () => {
      releaseStore(table, userId);
    };
  }, [store, table, userId]);

  // useSyncExternalStore requires stable function identities. The store's
  // methods are already stable (arrow properties bound in the constructor);
  // for the null path we return the module-scope noop and a memoized
  // snapshot getter so the identity never changes.
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

// ─── Derived convenience hooks ────────────────────────────────────────────

/** Subscribe to the `leads` table for the current user. */
export function useLeads(userId: string | null) {
  return useRealtimeTable("leads", userId);
}

/** Subscribe to the `campaigns` table for the current user. */
export function useCampaigns(userId: string | null) {
  return useRealtimeTable("campaigns", userId);
}

/** Subscribe to the `agent_runs` table for the current user. */
export function useAgentRuns(userId: string | null) {
  return useRealtimeTable("agent_runs", userId);
}
