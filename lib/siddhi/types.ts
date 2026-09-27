// lib/siddhi/types.ts

export type SiddhiRole = "system" | "user" | "assistant" | "tool";

export interface SiddhiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface SiddhiMessage {
  role: SiddhiRole;
  content: string;
  tool_calls?: SiddhiToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface SiddhiToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface SiddhiParameterSchema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

export interface SiddhiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, SiddhiParameterSchema>;
    required?: string[];
  };
  handler: (
    args: Record<string, unknown>,
    userId: string
  ) => Promise<SiddhiToolResult>;
}

export interface SiddhiProviderResult {
  text: string;
  provider: "groq" | "agnes" | "openrouter";
  model: string;
  toolCalls?: SiddhiToolCall[];
}

export interface SiddhiChatRequest {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
