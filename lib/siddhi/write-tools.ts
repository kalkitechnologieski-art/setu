// lib/siddhi/write-tools.ts
import { createClient } from "@/lib/supabase/server";
import { toJson } from "@/lib/types";
import type { SiddhiToolDefinition, SiddhiToolResult } from "./types";

interface PendingApprovalPayload {
  action: string;
  payload: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

async function proposeAction(
  userId: string,
  agentName: string,
  p: PendingApprovalPayload
): Promise<SiddhiToolResult> {
  const supabase = await createClient();

  // toJson() converts Record<string, unknown> → Json (recursive)
  const { data, error } = await supabase
    .from("approvals")
    .insert({
      user_id: userId,
      agent_name: agentName,
      action: p.action,
      payload: toJson(p.payload),
      reasoning: p.reasoning,
      confidence: p.confidence,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: {
      status: "pending_approval",
      approval_id: data?.id ?? null,
      action: p.action,
      message: "Drafted a pending action. Review it in the Approvals page.",
    },
  };
}

async function scheduleContentHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const body = typeof args.body === "string" ? args.body : "";
  const platforms = Array.isArray(args.platforms)
    ? (args.platforms as string[])
    : [];
  const scheduledFor =
    typeof args.scheduled_for === "string" ? args.scheduled_for : null;
  const title = typeof args.title === "string" ? args.title : "";

  if (!body || platforms.length === 0) {
    return { ok: false, error: "Body and at least one platform are required" };
  }

  return proposeAction(userId, "kabir", {
    action: "Schedule content post",
    payload: { title, body, platforms, scheduled_for: scheduledFor },
    confidence: 0.82,
    reasoning: `Post scheduled for ${platforms.join(", ")}${
      scheduledFor ? ` at ${scheduledFor}` : " (time TBD)"
    }.`,
  });
}

async function createCampaignHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const name = typeof args.name === "string" ? args.name : "";
  const type = typeof args.type === "string" ? args.type : "multi_channel";
  const budget = typeof args.budget === "number" ? args.budget : 0;

  if (!name) return { ok: false, error: "Campaign name is required" };
  if (!["email", "call", "multi_channel", "paid_ads"].includes(type)) {
    return { ok: false, error: "Invalid campaign type" };
  }

  return proposeAction(userId, "siddhi", {
    action: `Create ${type.replace("_", " ")} campaign`,
    payload: { name, type, budget },
    confidence: 0.85,
    reasoning: `Drafting a ${type.replace("_", " ")} campaign "${name}"${
      budget ? ` with ₹${budget.toLocaleString()} budget` : ""
    }.`,
  });
}

async function adjustBudgetHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const fromPlatform =
    typeof args.from_platform === "string" ? args.from_platform : "";
  const toPlatform =
    typeof args.to_platform === "string" ? args.to_platform : "";
  const amount = typeof args.amount === "number" ? args.amount : 0;
  if (!fromPlatform || !toPlatform || amount <= 0) {
    return { ok: false, error: "from_platform, to_platform and amount required" };
  }

  return proposeAction(userId, "siddhi", {
    action: `Rebalance ₹${amount.toLocaleString()} budget`,
    payload: { from_platform: fromPlatform, to_platform: toPlatform, amount },
    confidence: 0.78,
    reasoning: `Shifting ₹${amount.toLocaleString()} from ${fromPlatform} → ${toPlatform} based on ROAS gap.`,
  });
}

async function pauseCampaignHandler(
  args: Record<string, unknown>,
  userId: string
): Promise<SiddhiToolResult> {
  const campaign =
    typeof args.campaign_name === "string" ? args.campaign_name : "";
  if (!campaign) return { ok: false, error: "campaign_name is required" };

  return proposeAction(userId, "siddhi", {
    action: `Pause campaign: ${campaign}`,
    payload: { campaign_name: campaign },
    confidence: 0.8,
    reasoning: `Pausing "${campaign}" — flagged as underperformer.`,
  });
}

export const SIDDHI_WRITE_TOOLS: SiddhiToolDefinition[] = [
  {
    name: "schedule_content_post",
    description:
      "Draft a content post for the user to approve before it gets scheduled across platforms. Never writes directly — always creates a pending approval.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        platforms: { type: "array" },
        scheduled_for: { type: "string" },
      },
      required: ["body", "platforms"],
    },
    handler: scheduleContentHandler,
  },
  {
    name: "create_campaign",
    description: "Draft a new marketing campaign for approval.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["email", "call", "multi_channel", "paid_ads"] },
        budget: { type: "number" },
      },
      required: ["name", "type"],
    },
    handler: createCampaignHandler,
  },
  {
    name: "adjust_budget",
    description: "Draft a budget reallocation between ad platforms.",
    parameters: {
      type: "object",
      properties: {
        from_platform: { type: "string", enum: ["meta", "google", "youtube"] },
        to_platform: { type: "string", enum: ["meta", "google", "youtube"] },
        amount: { type: "number", minimum: 100 },
      },
      required: ["from_platform", "to_platform", "amount"],
    },
    handler: adjustBudgetHandler,
  },
  {
    name: "pause_campaign",
    description: "Draft a pause action for an underperforming campaign.",
    parameters: {
      type: "object",
      properties: { campaign_name: { type: "string" } },
      required: ["campaign_name"],
    },
    handler: pauseCampaignHandler,
  },
];
