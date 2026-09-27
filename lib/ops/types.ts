// lib/ops/types.ts
// Local shapes for operations-center queries.
// These mirror the DB rows but keep their own names so the UI layer doesn't
// depend on `Database` shape changes from the generator.
import type { Database } from "@/lib/supabase/types";

export type AgentRegistryRow    = Database["public"]["Tables"]["agent_registry"]["Row"];
export type AgentMetricRow      = Database["public"]["Tables"]["agent_metrics"]["Row"];
export type ApprovalChainRow    = Database["public"]["Tables"]["approval_chains"]["Row"];
export type GovernanceEventRow  = Database["public"]["Tables"]["governance_events"]["Row"];

export type Autonomy = "suggest" | "confirm" | "auto_with_rules" | "autonomous";
export type AgentStatus = "active" | "paused" | "deprecated";
export type GovernanceSeverity = "info" | "warning" | "critical";
