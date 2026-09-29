// lib/siddhi/tools.ts
// Context tools for report-first briefings. Every read tool is safe to call.
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardSummary, getAgents, getFunnelData,
  getRecentActivity, getPendingChains, getPlatformBreakdown,
  getGovernanceEvents,
} from "@/lib/ops/queries";
import { listContentPosts, getContentStats } from "@/lib/content/queries";
import type { SiddhiToolDefinition, SiddhiToolResult } from "./types";
import { SIDDHI_WRITE_TOOLS } from "./write-tools";

function ok(data: unknown): SiddhiToolResult { return { ok: true, data }; }
function fail(error: string): SiddhiToolResult { return { ok: false, error }; }

async function userContextHandler(
  _args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_context_snapshots")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return fail(error.message);
  if (!data) {
    return ok({
      identity: {}, activity: {}, business_state: {},
      preferences: {}, behavioral_patterns: {},
      last_computed_at: null,
    });
  }
  return ok(data);
}

async function pendingDecisionsHandler(
  _args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const supabase = await createClient();
  const [approvalsRes, signalsRes, convsRes] = await Promise.all([
    supabase.from("approvals")
      .select("id, agent_name, action, reasoning, confidence, risk_level, created_at")
      .eq("user_id", userId).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("signals")
      .select("id, title, urgency, source, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("conversations")
      .select("id, channel, subject, last_message_preview, sentiment, unread_count")
      .eq("user_id", userId).eq("status", "open")
      .order("last_message_at", { ascending: false }).limit(10),
  ]);
  return ok({
    approvals: approvalsRes.data ?? [],
    signals: signalsRes.data ?? [],
    conversations: convsRes.data ?? [],
    total:
      (approvalsRes.data ?? []).length +
      (signalsRes.data ?? []).length +
      (convsRes.data ?? []).length,
  });
}

async function businessHealthHandler(
  _args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const summary = await getDashboardSummary(userId);
  const platforms = await getPlatformBreakdown(userId);
  return ok({ summary, platforms });
}

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

async function contentStatsHandler(_args: Record<string, unknown>, userId: string) {
  const stats = await getContentStats(userId);
  return ok(stats);
}

async function listContentHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const limit = typeof args.limit === "number" ? args.limit : 20;
  const posts = await listContentPosts(userId, Math.min(limit, 50));
  return ok({ posts, count: posts.length });
}

const READ_TOOLS: SiddhiToolDefinition[] = [
  {
    name: "get_user_context",
    description: "Get the full context snapshot for the current user: identity, activity, business state, preferences, behavioral patterns.",
    parameters: { type: "object", properties: {} },
    handler: userContextHandler,
  },
  {
    name: "get_pending_decisions",
    description: "Get all decisions waiting on the user: pending approvals, new signals, open conversations.",
    parameters: { type: "object", properties: {} },
    handler: pendingDecisionsHandler,
  },
  {
    name: "get_business_health",
    description: "Get overall account health: leads, campaigns, approvals, AI runs, spend, conversions, ROAS, platform breakdown.",
    parameters: { type: "object", properties: {} },
    handler: businessHealthHandler,
  },
  {
    name: "list_leads",
    description: "Fetch the user's leads. Optionally filter by status or minimum ICP score.",
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
    name: "get_content_stats",
    description: "Get counts of drafts, scheduled, published, pending posts.",
    parameters: { type: "object", properties: {} },
    handler: contentStatsHandler,
  },
  {
    name: "list_content_posts",
    description: "List the user's content posts.",
    parameters: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
    },
    handler: listContentHandler,
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
