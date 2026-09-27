// lib/siddhi/execute.ts
import { findTool } from "./tools";
import type { SiddhiToolResult } from "./types";

export async function executeTool(
  toolName: string,
  rawArgs: string,
  userId: string
): Promise<SiddhiToolResult> {
  const tool = findTool(toolName);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${toolName}` };
  }

  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch (e) {
    return {
      ok: false,
      error: `Invalid tool arguments: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  try {
    return await tool.handler(args, userId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
