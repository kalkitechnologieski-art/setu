// lib/services/bus.ts
// Service registry + invocation. Every call returns ServiceResult<T>.
// Never throws. Never blocks on a downstream failure.

import type { ServiceResult, FailureReason } from "@/lib/resilience";

export type ServiceId = "email" | "calling" | "leads" | "performance" | "assistant";

export interface ProviderStatus {
  name: string;
  configured: boolean;
  circuit: string;
}

export interface ServiceHealth {
  id: ServiceId;
  name: string;
  ready: boolean;
  configured: boolean;
  degraded: boolean;
  providers: ProviderStatus[];
  bulkhead: { active: number; queued: number; max: number };
  missingCapabilities: string[];
}

export interface ServiceRegistration {
  id: ServiceId;
  name: string;
  actions: readonly string[];
  invoke: (action: string, payload: unknown) => Promise<ServiceResult<unknown>>;
  healthCheck: () => Promise<ServiceHealth>;
}

class ServiceBus {
  private readonly registry = new Map<ServiceId, ServiceRegistration>();

  register(reg: ServiceRegistration): void {
    this.registry.set(reg.id, reg);
  }

  isRegistered(id: ServiceId): boolean {
    return this.registry.has(id);
  }

  list(): ServiceId[] {
    return Array.from(this.registry.keys());
  }

  async invoke<T = unknown>(
    serviceId: ServiceId,
    action: string,
    payload: unknown
  ): Promise<ServiceResult<T>> {
    const reg = this.registry.get(serviceId);
    if (!reg) {
      return {
        ok: false,
        error: `Service not registered: ${serviceId}`,
        reason: "not_configured",
        provider: serviceId,
        durationMs: 0,
      };
    }
    if (!reg.actions.includes(action)) {
      return {
        ok: false,
        error: `Unknown action "${action}" for service ${serviceId}`,
        reason: "validation_error",
        provider: serviceId,
        durationMs: 0,
      };
    }
    try {
      const result = await reg.invoke(action, payload);
      return result as ServiceResult<T>;
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
        reason: "unknown" as FailureReason,
        provider: serviceId,
        durationMs: 0,
      };
    }
  }

  async healthAll(): Promise<ServiceHealth[]> {
    const out: ServiceHealth[] = [];
    for (const reg of this.registry.values()) {
      try {
        out.push(await reg.healthCheck());
      } catch {
        out.push({
          id: reg.id,
          name: reg.name,
          ready: false,
          configured: false,
          degraded: true,
          providers: [],
          bulkhead: { active: 0, queued: 0, max: 0 },
          missingCapabilities: ["health_check_failed"],
        });
      }
    }
    return out;
  }

  async healthOne(id: ServiceId): Promise<ServiceHealth | null> {
    const reg = this.registry.get(id);
    if (!reg) return null;
    try {
      return await reg.healthCheck();
    } catch {
      return null;
    }
  }
}

let bus: ServiceBus | null = null;

export function getServiceBus(): ServiceBus {
  if (!bus) bus = new ServiceBus();
  return bus;
}
