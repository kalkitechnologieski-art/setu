// lib/siddhi/tools.ts
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardSummary,
  getAgents,
  getFunnelData,
  getRecentActivity,
  getPendingChains,
  getPlatformBreakdown,
  getGovernanceEvents,
} from "@/lib/ops/queries";
import { listContentPosts, getContentStats } from "@/lib/content/queries";
import type { SiddhiToolDefinition, SiddhiToolResult } from "./types";
import { SIDDHI_WRITE_TOOLS } from "./write-tools";

function ok(data: unknown): SiddhiToolResult { return { ok: true, data }; }
function fail(error: string): SiddhiToolResult { return { ok: false, error }; }

async function listLeadsHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const supabase = await createClient();
  const status = typeof args.status === "string" && args.status !== "all" ? args.status : null;
  const minScore = typeof args.min_score === "number" ? args.min_score : null;
  const limit = typeof args.limit === "number" ? args.limit : 20;

  let q = supabase
    .from("leads")
    .select("id, name, email, company, score, status, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));
  if (status) q = q.eq("status", status);
  if (minScore !== null) q = q.gte("score", minScore);

  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok({ leads: data ?? [], count: data?.length ?? 0 });
}

async function dashboardSummaryHandler(
  _args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const summary = await getDashboardSummary(userId);
  return ok(summary);
}

async function agentStatusHandler(
  _args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const agents = await getAgents(userId);
  return ok({
    agents: agents.map((a) => ({
      slug: a.slug, name: a.name, role: a.role,
      autonomy: a.autonomy, status: a.status, capabilities: a.capabilities,
    })),
  });
}

async function funnelHandler(_args: Record<string, unknown>, userId: string) {
  const stages = await getFunnelData(userId);
  return ok({ stages });
}

async function activityHandler(args: Record<string, unknown>, userId: string) {
  const limit = typeof args.limit === "number" ? args.limit : 10;
  const activity = await getRecentActivity(userId, Math.min(limit, 50));
  return ok({ activity });
}

async function platformBreakdownHandler(_args: Record<string, unknown>, userId: string) {
  const breakdown = await getPlatformBreakdown(userId);
  return ok({ platforms: breakdown });
}

async function pendingApprovalsHandler(_args: Record<string, unknown>, userId: string) {
  const chains = await getPendingChains(userId);
  return ok({ chains, count: chains.length });
}

async function governanceHandler(args: Record<string, unknown>, userId: string) {
  const limit = typeof args.limit === "number" ? args.limit : 20;
  const events = await getGovernanceEvents(userId, Math.min(limit, 100));
  return ok({ events });
}

async function campaignsHandler(_args: Record<string, unknown>, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, status, type, metrics, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return fail(error.message);
  return ok({ campaigns: data ?? [] });
}

async function emailPerformanceHandler(_args: Record<string, unknown>, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("status, sent_at, opened_at")
    .eq("status", "sent")
    .limit(500);
  if (error) return fail(error.message);
  const sent = (data ?? []).length;
  const opened = (data ?? []).filter((e) => e.opened_at).length;
  void userId;
  return ok({
    emails_sent: sent,
    emails_opened: opened,
    open_rate: sent > 0 ? (opened / sent) * 100 : 0,
  });
}

async function listContentHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const limit = typeof args.limit === "number" ? args.limit : 20;
  const posts = await listContentPosts(userId, Math.min(limit, 50));
  return ok({ posts, count: posts.length });
}

async function contentStatsHandler(_args: Record<string, unknown>, userId: string) {
  const stats = await getContentStats(userId);
  return ok(stats);
}

const READ_TOOLS: SiddhiToolDefinition[] = [
  {
    name: "list_leads",
    description:
      "Fetch the user's leads. Optionally filter by status or minimum ICP score.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "qualified", "converted", "lost", "all"] },
        min_score: { type: "integer", minimum: 0, maximum: 100 },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
    },
    handler: listLeadsHandler,
  },
  {
    name: "get_dashboard_summary",
    description: "Get overall KPIs: leads, campaigns, approvals, AI runs, spend, conversions, ROAS.",
    parameters: { type: "object", properties: {} },
    handler: dashboardSummaryHandler,
  },
  {
    name: "get_agent_statuses",
    description: "Get the status of the four AI employees.",
    parameters: { type: "object", properties: {} },
    handler: agentStatusHandler,
  },
  {
    name: "get_funnel_data",
    description: "Get the conversion funnel with counts and rates.",
    parameters: { type: "object", properties: {} },
    handler: funnelHandler,
  },
  {
    name: "get_recent_activity",
    description: "Get recent activity events.",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
    },
    handler: activityHandler,
  },
  {
    name: "get_platform_breakdown",
    description: "Get ad performance by platform.",
    parameters: { type: "object", properties: {} },
    handler: platformBreakdownHandler,
  },
  {
    name: "get_pending_approvals",
    description: "Get pending approval chains.",
    parameters: { type: "object", properties: {} },
    handler: pendingApprovalsHandler,
  },
  {
    name: "get_governance_events",
    description: "Get the audit log.",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100 } },
    },
    handler: governanceHandler,
  },
  {
    name: "get_campaigns",
    description: "Get the user's campaigns with status and metrics.",
    parameters: { type: "object", properties: {} },
    handler: campaignsHandler,
  },
  {
    name: "get_email_performance",
    description: "Get email sending and open rates.",
    parameters: { type: "object", properties: {} },
    handler: emailPerformanceHandler,
  },
  {
    name: "list_content_posts",
    description: "List the user's content posts (drafts, scheduled, published).",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
    },
    handler: listContentHandler,
  },
  {
    name: "get_content_stats",
    description: "Get counts of drafts, scheduled, published, pending posts.",
    parameters: { type: "object", properties: {} },
    handler: contentStatsHandler,
  },
];

export const SIDDHI_TOOLS: SiddhiToolDefinition[] = [
  ...READ_TOOLS,
  ...SIDDHI_WRITE_TOOLS,
];

export function findTool(name: string): SiddhiToolDefinition | undefined {
  return SIDDHI_TOOLS.find((t) => t.name === name);
}

export function isWriteTool(name: string): boolean {
  return SIDDHI_WRITE_TOOLS.some((t) => t.name === name);
}

export function toolsForLLM(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: SiddhiToolDefinition["parameters"];
  };
}> {
  return SIDDHI_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
