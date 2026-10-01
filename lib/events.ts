// lib/events.ts
// Append-only event log. Writes to public.events.
// Never throws. Never blocks the calling operation.

import { untypedTable } from "@/lib/db/untyped";
import { logger } from "./logger";
import { toJson } from "@/lib/types";
import { createTraceId } from "./tracing";

export interface DomainEvent {
  userId?: string | null;
  orgId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export async function emit(event: DomainEvent): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "__SET_ME__") return;

  try {
    await untypedTable("events").insert({
      user_id: event.userId ?? null,
      org_id: event.orgId ?? null,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      event_type: event.eventType,
      payload: toJson(event.payload),
      metadata: toJson({
        ...(event.metadata ?? {}),
        traceId: event.traceId ?? createTraceId(),
      }),
    });
  } catch (e) {
    logger.warn("event_emit_failed", {
      error: e instanceof Error ? e.message : String(e),
      eventType: event.eventType,
    });
  }
}

export interface EventRow {
  id: number;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  metadata: unknown;
  created_at: string;
}

export async function listEvents(
  filters: {
    aggregateType?: string;
    aggregateId?: string;
    eventType?: string;
    limit?: number;
  } = {}
): Promise<EventRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "__SET_ME__") return [];

  try {
    let chain = untypedTable("events").select("*");
    if (filters.aggregateType) chain = chain.eq("aggregate_type", filters.aggregateType);
    if (filters.aggregateId) chain = chain.eq("aggregate_id", filters.aggregateId);
    if (filters.eventType) chain = chain.eq("event_type", filters.eventType);
    chain = chain.order("created_at", { ascending: false }).limit(filters.limit ?? 100);

    const result = await new Promise<{
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    }>((resolve) => {
      chain.then((v) => resolve(v));
    });

    if (result.error || !result.data) return [];
    return result.data as unknown as EventRow[];
  } catch {
    return [];
  }
}
