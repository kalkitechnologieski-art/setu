// lib/audit.ts
// Immutable audit trail. Writes to public.audit_log.
// Never throws — audit failure must never break the calling operation.

import { untypedTable } from "@/lib/db/untyped";
import { logger } from "./logger";
import { toJson } from "@/lib/types";

export type AuditActorType = "human" | "agent" | "system";

export interface AuditEvent {
  userId?: string | null;
  orgId?: string | null;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function audit(event: AuditEvent): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "__SET_ME__") return;

  try {
    await untypedTable("audit_log").insert({
      user_id: event.userId ?? null,
      org_id: event.orgId ?? null,
      actor_type: event.actorType,
      actor_id: event.actorId,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId ?? null,
      before: event.before ? toJson(event.before) : null,
      after: event.after ? toJson(event.after) : null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (e) {
    logger.warn("audit_write_failed", {
      error: e instanceof Error ? e.message : String(e),
      action: event.action,
    });
  }
}
