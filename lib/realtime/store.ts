// lib/realtime/store.ts
// ═══════════════════════════════════════════════════════════════════════════
// Realtime store factory — useSyncExternalStore-compatible.
//
// SINGLE SOURCE OF TRUTH:
//   All snapshot construction goes through createEmptySnapshot<T>().
//   Never hand-write a snapshot literal anywhere — a 5-field interface will
//   drift from a 3-field fallback, and TypeScript will flag it as TS2739.
//
// STRUCTURAL CALLBACK TYPES:
//   supabase-js constrains `RealtimePostgresChangesPayload<T extends
//   { [key: string]: any }>`. A free class generic can't satisfy that, so
//   the postgres_changes overload fails to match (TS2344). We type the
//   callback locally with the three fields we actually read. See
//   supabase/supabase-js#1451 for the upstream discussion.
//
// RESILIENCE:
//   • Status machine: idle → connecting → subscribed → reconnecting → error
//   • Exponential backoff with full jitter (1s → 30s cap, 8 attempts)
//   • 5-second grace period before teardown (React 19 Strict Mode safe)
//   • Listener error isolation
//   • Disposed-flag guards on every async continuation
//   • Self-unregistering registry
// ═══════════════════════════════════════════════════════════════════════════
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

// ─── Public types ─────────────────────────────────────────────────────────

/** Tables the Realtime layer knows how to track. */
export type TrackedTable = "leads" | "campaigns" | "agent_runs";

/** Row type for a given tracked table, derived from the Supabase schema. */
export type TrackedRow<K extends TrackedTable> =
  Database["public"]["Tables"][K]["Row"];

/** Connection lifecycle states surfaced to the UI. */
export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "subscribed"
  | "reconnecting"
  | "error"
  | "closed";

/** Immutable snapshot returned by the store and by every hook. */
export interface RealtimeSnapshot<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  status: RealtimeConnectionStatus;
  /** Consecutive reconnect attempts since the last SUBSCRIBED. */
  reconnectAttempt: number;
}

// ─── Internal types ───────────────────────────────────────────────────────

/**
 * Structural payload shape passed to the postgres_changes callback.
 * Matches the runtime object without depending on supabase-js's constrained
 * generic. Only the three fields we read are declared.
 */
type PostgresChangePayload<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
};

type Listener = () => void;

// ─── Constants ────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 8;
const BACKOFF_CAP_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const TEARDOWN_GRACE_MS = 5_000;

// ─── Snapshot factory — the single source of truth ────────────────────────

/**
 * Create a fresh, frozen empty snapshot. Every snapshot-literal in the
 * codebase must go through this function so that future field additions
 * cannot cause TS2739 elsewhere.
 */
export function createEmptySnapshot<T>(): RealtimeSnapshot<T> {
  return {
    data: [],
    loading: false,
    error: null,
    status: "idle",
    reconnectAttempt: 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function backoffMs(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
  // Full jitter: 50%–100% of the computed delay
  return Math.floor(base * (0.5 + Math.random() * 0.5));
}

function idOf(row: unknown): string | number | undefined {
  if (row && typeof row === "object" && "id" in row) {
    const v = (row as { id: unknown }).id;
    if (typeof v === "string" || typeof v === "number") return v;
  }
  return undefined;
}

const isDev = process.env.NODE_ENV !== "production";
function devWarn(...args: unknown[]): void {
  if (isDev) console.warn("[realtime]", ...args);
}

// ─── Store ────────────────────────────────────────────────────────────────

class RealtimeStore<T> {
  /** Initial snapshot — always via the factory so it matches the interface. */
  private snapshot: RealtimeSnapshot<T> = createEmptySnapshot<T>();

  private listeners = new Set<Listener>();
  private channel: RealtimeChannel | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private teardownTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private started = false;
  private disposed = false;

  private readonly key: string;
  private readonly table: TrackedTable;
  private readonly userId: string;

  constructor(table: TrackedTable, userId: string) {
    this.key = `${table}:${userId}`;
    this.table = table;
    this.userId = userId;
  }

  // ── Public API used by useSyncExternalStore ──────────────────────────

  getSnapshot = (): RealtimeSnapshot<T> => this.snapshot;

  getServerSnapshot = (): RealtimeSnapshot<T> => createEmptySnapshot<T>();

  subscribe = (listener: Listener): (() => void) => {
    if (this.teardownTimer !== null) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }

    this.listeners.add(listener);

    if (!this.started && !this.disposed) {
      void this.start();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.scheduleTeardown();
      }
    };
  };

  // ── State transitions ────────────────────────────────────────────────

  private emit(next: Partial<RealtimeSnapshot<T>>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        devWarn("listener threw — isolated", err);
      }
    }
  }

  private scheduleTeardown(): void {
    if (this.teardownTimer !== null) return;
    this.teardownTimer = setTimeout(() => {
      this.teardownTimer = null;
      if (this.listeners.size === 0) {
        void this.dispose();
      }
    }, TEARDOWN_GRACE_MS);
  }

  private scheduleReconnect(attempt: number): void {
    if (this.disposed) return;
    if (this.reconnectTimer !== null) return;

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      devWarn(`giving up after ${attempt} attempts`);
      this.emit({
        status: "error",
        loading: false,
        error: "Realtime connection failed after multiple attempts",
        reconnectAttempt: attempt,
      });
      return;
    }

    const delay = backoffMs(attempt);
    devWarn(`reconnect attempt ${attempt + 1} in ${delay}ms`);
    this.emit({ status: "reconnecting", reconnectAttempt: attempt });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.disposed) return;
      void this.start({ isReconnect: true, attempt: attempt + 1 });
    }, delay);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  private async start(
    opts: { isReconnect?: boolean; attempt?: number } = {}
  ): Promise<void> {
    if (this.disposed) return;
    this.started = true;
    this.emit({
      loading: true,
      status: opts.isReconnect ? "reconnecting" : "connecting",
    });

    const supabase = createClient();

    // ── 1. Initial fetch (abortable) ─────────────────────────────────
    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const { data, error } = await supabase
        .from(this.table)
        .select("*")
        .eq("user_id", this.userId)
        .order("created_at", { ascending: false })
        .limit(100)
        .abortSignal(this.abortController.signal);

      if (this.disposed) return;

      if (error) {
        this.emit({ data: [], loading: false, error: error.message });
      } else {
        this.emit({
          data: (data ?? []) as unknown as T[],
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      if (this.disposed) return;
      // Aborts are expected on dispose / re-entry; don't surface them.
      if (err instanceof Error && err.name === "AbortError") return;
      this.emit({
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (this.disposed) return;

    // ── 2. Realtime channel ──────────────────────────────────────────
    await this.teardownChannel();
    if (this.disposed) return;

    const handler = (raw: unknown): void => {
      if (this.disposed) return;
      const payload = raw as PostgresChangePayload<T>;
      const current = this.snapshot.data;

      if (payload.eventType === "DELETE") {
        const removedId = idOf(payload.old);
        if (removedId === undefined) return;
        this.emit({ data: current.filter((row) => idOf(row) !== removedId) });
        return;
      }

      const incoming = payload.new;
      const incomingId = idOf(incoming);
      if (incomingId === undefined) return;

      const idx = current.findIndex((row) => idOf(row) === incomingId);
      const next = [...current];
      if (idx >= 0) next[idx] = incoming;
      else next.unshift(incoming);

      this.emit({ data: next });
    };

    this.channel = supabase
      .channel(`realtime:${this.key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.table,
          filter: `user_id=eq.${this.userId}`,
        },
        handler as unknown as (payload: unknown) => void
      );

    this.channel.subscribe((status, err) => {
      if (this.disposed) return;

      switch (status) {
        case "SUBSCRIBED":
          this.emit({
            status: "subscribed",
            error: null,
            reconnectAttempt: 0,
          });
          break;
        case "CHANNEL_ERROR":
          devWarn("CHANNEL_ERROR", err?.message ?? "(no message)");
          this.scheduleReconnect(opts.attempt ?? 0);
          break;
        case "TIMED_OUT":
          devWarn("TIMED_OUT");
          this.scheduleReconnect(opts.attempt ?? 0);
          break;
        case "CLOSED":
          devWarn("CLOSED");
          this.scheduleReconnect(opts.attempt ?? 0);
          break;
        default:
          devWarn("unknown status", status);
      }
    });
  }

  private async teardownChannel(): Promise<void> {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.channel === null) return;

    const channel = this.channel;
    this.channel = null;

    try {
      const supabase = createClient();
      await supabase.removeChannel(channel);
    } catch (err) {
      devWarn("removeChannel threw — swallowed", err);
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    if (this.teardownTimer !== null) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }

    this.abortController?.abort();
    this.abortController = null;

    await this.teardownChannel();

    this.listeners.clear();
    this.emit({ status: "closed" });

    // Self-unregister if we are still the canonical store for this key.
    unregisterIfCurrent(this.key, this);
  }
}

// ─── Registry ─────────────────────────────────────────────────────────────

const REGISTRY = new Map<string, RealtimeStore<unknown>>();
const REF_COUNTS = new Map<string, number>();

function unregisterIfCurrent(
  key: string,
  store: RealtimeStore<unknown>
): void {
  if (REGISTRY.get(key) === store) {
    REGISTRY.delete(key);
  }
  // Only clear the ref count when no acquisition is in flight.
  const count = REF_COUNTS.get(key) ?? 0;
  if (count <= 0) REF_COUNTS.delete(key);
}

/**
 * Acquire (or reuse) the singleton store for a given (table, userId) pair.
 * Reference-counted — call releaseStore with the same arguments to
 * decrement. The store disposes itself after the last release plus the
 * grace window.
 */
export function acquireStore<K extends TrackedTable>(
  table: K,
  userId: string
): RealtimeStore<TrackedRow<K>> {
  const key = `${table}:${userId}`;
  let store = REGISTRY.get(key) as RealtimeStore<TrackedRow<K>> | undefined;
  if (!store) {
    store = new RealtimeStore<TrackedRow<K>>(table, userId);
    REGISTRY.set(key, store as RealtimeStore<unknown>);
  }
  REF_COUNTS.set(key, (REF_COUNTS.get(key) ?? 0) + 1);
  return store;
}

/**
 * Decrement the reference count. When it reaches zero, the store disposes
 * itself after a 5-second grace window, allowing React 19 Strict Mode's
 * double-mount cycle to reuse the same channel.
 */
export function releaseStore(table: TrackedTable, userId: string): void {
  const key = `${table}:${userId}`;
  const count = (REF_COUNTS.get(key) ?? 1) - 1;
  if (count <= 0) {
    REF_COUNTS.delete(key);
    // Dispose scheduled by the store when its last listener left.
  } else {
    REF_COUNTS.set(key, count);
  }
}
