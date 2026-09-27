// lib/mcp/types.ts

export type MCPService = "munin" | "agentcall" | "markifact" | "resend";

export type MCPToolKind = "read" | "write";

export interface MCPToolDefinition {
  name: string;
  service: MCPService;
  kind: MCPToolKind;
  requiresApproval: boolean;
  description: string;
}

export interface MCPCallResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  requiresApproval?: boolean;
  approvalToken?: string;
}
