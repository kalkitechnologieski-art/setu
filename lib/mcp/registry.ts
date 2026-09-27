// lib/mcp/registry.ts
import type { MCPToolDefinition, MCPService } from "./types";

export const MCP_TOOLS: readonly MCPToolDefinition[] = [
  // ─── Munin CRM ────────────────────────────────────────────────────────
  { name: "munin.create_contact", service: "munin", kind: "write", requiresApproval: true, description: "Create a new contact in Munin CRM" },
  { name: "munin.search_contacts", service: "munin", kind: "read", requiresApproval: false, description: "Search contacts by query" },
  { name: "munin.log_conversation", service: "munin", kind: "write", requiresApproval: true, description: "Log a conversation against a contact" },
  { name: "munin.update_contact", service: "munin", kind: "write", requiresApproval: true, description: "Update contact fields" },

  // ─── AgentCall Telephony ──────────────────────────────────────────────
  { name: "agentcall.send_sms", service: "agentcall", kind: "write", requiresApproval: true, description: "Send SMS via AgentCall" },
  { name: "agentcall.initiate_call", service: "agentcall", kind: "write", requiresApproval: true, description: "Start an outbound voice call" },
  { name: "agentcall.get_transcript", service: "agentcall", kind: "read", requiresApproval: false, description: "Fetch call transcript" },

  // ─── Markifact Performance Marketing ──────────────────────────────────
  { name: "markifact.analyze_performance", service: "markifact", kind: "read", requiresApproval: false, description: "Cross-platform ad performance audit" },
  { name: "markifact.create_campaign", service: "markifact", kind: "write", requiresApproval: true, description: "Create a new ad campaign" },
  { name: "markifact.optimize_budget", service: "markifact", kind: "write", requiresApproval: true, description: "Reallocate budget across campaigns" },
  { name: "markifact.keyword_research", service: "markifact", kind: "read", requiresApproval: false, description: "Unified keyword research" },
  { name: "markifact.audience_management", service: "markifact", kind: "write", requiresApproval: true, description: "Create or update audiences" },
  { name: "markifact.creative_rotation", service: "markifact", kind: "write", requiresApproval: true, description: "Rotate creative assets" },

  // ─── Resend Email ─────────────────────────────────────────────────────
  { name: "resend.send_email", service: "resend", kind: "write", requiresApproval: true, description: "Send transactional email" },
  { name: "resend.get_status", service: "resend", kind: "read", requiresApproval: false, description: "Check email delivery status" },
] as const;

export function toolsForService(service: MCPService): MCPToolDefinition[] {
  return MCP_TOOLS.filter((t) => t.service === service);
}

export function findTool(name: string): MCPToolDefinition | undefined {
  return MCP_TOOLS.find((t) => t.name === name);
}

export function requiresApproval(toolName: string): boolean {
  return findTool(toolName)?.requiresApproval ?? true;
}
