// lib/services/registry.ts — registers every service on first import.
import { registerEmailService } from "./email";
import { registerCallingService } from "./calling";
import { registerLeadsService } from "./leads";
import { registerPerformanceService } from "./performance";
import { registerAssistantService } from "./assistant";

let bootstrapped = false;

export function bootstrapServices(): void {
  if (bootstrapped) return;
  registerEmailService();
  registerCallingService();
  registerLeadsService();
  registerPerformanceService();
  registerAssistantService();
  bootstrapped = true;
}

export { getServiceBus } from "./bus";
export type { ServiceId, ServiceHealth, ProviderStatus } from "./bus";
