// lib/mcp/client.ts
import type { MCPService, MCPCallResult } from "./types";

interface MCPServerConfig {
  url: string;
  apiKeyEnv: string;
}

const SERVERS: Record<MCPService, MCPServerConfig> = {
  munin: {
    url: process.env.MUNIN_MCP_URL ?? "",
    apiKeyEnv: "MUNIN_API_KEY",
  },
  agentcall: {
    url: "https://api.agentcall.co/v1",
    apiKeyEnv: "AGENTCALL_API_KEY",
  },
  markifact: {
    url: process.env.MARKIFACT_MCP_URL ?? "https://api.markifact.com/mcp",
    apiKeyEnv: "MARKIFACT_API_KEY",
  },
  resend: {
    url: "https://api.resend.com",
    apiKeyEnv: "RESEND_API_KEY",
  },
};

function getAuthHeader(service: MCPService): Record<string, string> {
  const cfg = SERVERS[service];
  const key = process.env[cfg.apiKeyEnv];
  if (!key || key === "__SET_ME__") {
    return {};
  }
  return { Authorization: `Bearer ${key}` };
}

export async function callMCP<T = unknown>(
  service: MCPService,
  tool: string,
  args: Record<string, unknown>
): Promise<MCPCallResult<T>> {
  const cfg = SERVERS[service];
  if (!cfg.url) {
    return { ok: false, error: `MCP service ${service} has no URL configured` };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(service),
  };

  try {
    const res = await fetch(`${cfg.url}/tools/${tool}`, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${service}.${tool} ${res.status}: ${body}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function isServiceConfigured(service: MCPService): boolean {
  const cfg = SERVERS[service];
  if (!cfg.url) return false;
  const key = process.env[cfg.apiKeyEnv];
  return !!key && key !== "__SET_ME__";
}
