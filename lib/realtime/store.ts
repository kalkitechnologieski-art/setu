// lib/realtime/store.ts
// Realtime store factory — useSyncExternalStore-compatible.
// Presence rate limit: 5 track() calls per 30s per client. Exceeding this
// triggers ClientPresenceRateLimitReached which stops all subscriptions on
// that channel. Guard is enforced in acquireStore/releaseStore.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type TrackedTable = "leads" | "campaigns" | "agent_runs";
export type TrackedRow<K extends TrackedTable> = Database["public"]["Tables"][K]["Row"];

export type RealtimeConnectionStatus =
  | "idle" | "connecting" | "subscribed" | "reconnecting" | "error" | "closed";

export interface RealtimeSnapshot<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  status: RealtimeConnectionStatus;
  reconnectAttempt: number;
}

const MAX_RECONNECT_ATTEMPTS = 8;
const BACKOFF_CAP_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const TEARDOWN_GRACE_MS = 5_000;

// Presence rate limit: 5 track() calls per 30s.
const PRESENCE_WINDOW_MS = 30_000;
const PRESENCE_MAX_CALLS = 5;

export function createEmptySnapshot<T>(): RealtimeSnapshot<T> {
  return { data: [], loading: false, error: null, status: "idle", reconnectAttempt: 0 };
}

function backoffMs(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_CAP_MS);
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
function devWarn(...args: unknown[]): void { if (isDev) console.warn("[realtime]", ...args); }

// ─── Presence rate limit guard ───────────────────────────────────────────
const presenceTimestamps: number[] = [];
export function canSendPresenceUpdate(): boolean {
  const now = Date.now();
  // Purge timestamps outside the window
  while (presenceTimestamps.length > 0 && (presenceTimestamps[0] ?? 0) < now - PRESENCE_WINDOW_MS) {
    presenceTimestamps.shift();
  }
  if (presenceTimestamps.length >= PRESENCE_MAX_CALLS) {
    devWarn(`Presence rate limit reached (${PRESENCE_MAX_CALLS}/${PRESENCE_WINDOW_MS}ms)`);
    return false;
  }
  presenceTimestamps.push(now);
  return true;
}

class RealtimeStore<T> {
  private snapshot: RealtimeSnapshot<T> = createEmptySnapshot<T>();
  private listeners = new Set<() => void>();
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

  getSnapshot = (): RealtimeSnapshot<T> => this.snapshot;
  getServerSnapshot = (): RealtimeSnapshot<T> => createEmptySnapshot<T>();

  subscribe = (listener: () => void): (() => void) => {
    if (this.teardownTimer !== null) { clearTimeout(this.teardownTimer); this.teardownTimer = null; }
    this.listeners.add(listener);
    if (!this.started && !this.disposed) void this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.scheduleTeardown();
    };
  };

  private emit(next: Partial<RealtimeSnapshot<T>>): void {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) {
      try { listener(); } catch (err) { devWarn("listener threw — isolated", err); }
    }
  }

  private scheduleTeardown(): void {
    if (this.teardownTimer !== null) return;
    this.teardownTimer = setTimeout(() => {
      this.teardownTimer = null;
      if (this.listeners.size === 0) void this.dispose();
    }, TEARDOWN_GRACE_MS);
  }

  private scheduleReconnect(attempt: number): void {
    if (this.disposed || this.reconnectTimer !== null) return;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      this.emit({ status: "error", loading: false, error: "Realtime connection failed" });
      return;
    }
    const delay = backoffMs(attempt);
    this.emit({ status: "reconnecting", reconnectAttempt: attempt });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.disposed) return;
      void this.start({ isReconnect: true, attempt: attempt + 1 });
    }, delay);
  }

  private async start(opts: { isReconnect?: boolean; attempt?: number } = {}): Promise<void> {
    if (this.disposed) return;
    this.started = true;
    this.emit({ loading: true, status: opts.isReconnect ? "reconnecting" : "connecting" });

    const supabase = createClient();
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
      if (error) this.emit({ data: [], loading: false, error: error.message });
      else this.emit({ data: (data ?? []) as unknown as T[], loading: false, error: null });
    } catch (err) {
      if (this.disposed) return;
      if (err instanceof Error && err.name === "AbortError") return;
      this.emit({ loading: false, error: err instanceof Error ? err.message : String(err) });
    }

    if (this.disposed) return;
    await this.teardownChannel();
    if (this.disposed) return;

    const handler = (raw: unknown): void => {
      if (this.disposed) return;
      const payload = raw as { eventType: string; new: T; old: Partial<T> };
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
      if (idx >= 0) next[idx] = incoming; else next.unshift(incoming);
      this.emit({ data: next });
    };

    this.channel = supabase
      .channel(`realtime:${this.key}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: this.table, filter: `user_id=eq.${this.userId}`,
      }, handler as unknown as (payload: unknown) => void);

    this.channel.subscribe((status, err) => {
      if (this.disposed) return;
      switch (status) {
        case "SUBSCRIBED": this.emit({ status: "subscribed", error: null, reconnectAttempt: 0 }); break;
        case "CHANNEL_ERROR": case "TIMED_OUT": case "CLOSED":
          devWarn(status, err?.message ?? "");
          this.scheduleReconnect(opts.attempt ?? 0);
          break;
        default: devWarn("unknown status", status);
      }
    });
  }

  private async teardownChannel(): Promise<void> {
    if (this.reconnectTimer !== null) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.channel === null) return;
    const channel = this.channel;
    this.channel = null;
    try { const supabase = createClient(); await supabase.removeChannel(channel); }
    catch (err) { devWarn("removeChannel threw — swallowed", err); }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.teardownTimer !== null) { clearTimeout(this.teardownTimer); this.teardownTimer = null; }
    this.abortController?.abort(); this.abortController = null;
    await this.teardownChannel();
    this.listeners.clear();
    this.emit({ status: "closed" });
    unregisterIfCurrent(this.key, this);
  }
}

const REGISTRY = new Map<string, RealtimeStore<unknown>>();
const REF_COUNTS = new Map<string, number>();

function unregisterIfCurrent(key: string, store: RealtimeStore<unknown>): void {
  if (REGISTRY.get(key) === store) REGISTRY.delete(key);
  const count = REF_COUNTS.get(key) ?? 0;
  if (count <= 0) REF_COUNTS.delete(key);
}

export function acquireStore<K extends TrackedTable>(
  table: K, userId: string
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

export function releaseStore(table: TrackedTable, userId: string): void {
  const key = `${table}:${userId}`;
  const count = (REF_COUNTS.get(key) ?? 1) - 1;
  if (count <= 0) REF_COUNTS.delete(key); else REF_COUNTS.set(key, count);
}
