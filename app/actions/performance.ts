// app/actions/performance.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import { callMCP } from "@/lib/mcp/client";
import type {
  PerformanceAudit,
  BudgetRecommendation,
} from "@/lib/types";

const FetchPerformanceSchema = z.object({
  platforms: z.array(z.string().min(1)).min(1).max(10),
  dateRange: z.string().default("last_30_days"),
});

export const fetchPerformance = withAction({
  schema: FetchPerformanceSchema,
  handler: async (
    input,
    { userId, supabase }
  ): Promise<PerformanceAudit> => {
    const result = await callMCP<PerformanceAudit>(
      "markifact",
      "analyze_performance",
      { platforms: input.platforms, date_range: input.dateRange }
    );

    if (!result.ok || !result.data) {
      throw new Error(result.error ?? "Performance fetch failed");
    }

    // Cache rows for the dashboard
    if (result.data.metrics.length > 0) {
      const rows = result.data.metrics.map((m) => ({
        user_id: userId,
        platform: m.platform,
        campaign_name: m.campaign_name,
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
        roas: m.roas,
      }));
      const { error } = await supabase.from("ad_performance").insert(rows);
      if (error) throw mapSupabaseError(error);
    }

    revalidatePath("/dashboard/performance");
    return result.data;
  },
});

const PrepareBudgetChangeSchema = z.object({
  recommendations: z.array(
    z.object({
      campaign_id: z.string().min(1),
      platform: z.string().min(1),
      current_budget: z.number(),
      recommended_budget: z.number(),
      reason: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ).min(1),
});

export const prepareBudgetChange = withAction({
  schema: PrepareBudgetChangeSchema,
  handler: async (
    input,
    { userId, supabase, correlationId }
  ): Promise<{ status: "pending_approval"; changes: BudgetRecommendation[] }> => {
    // Human-in-the-loop: never execute; record the pending approval
    const { error } = await supabase.from("agent_runs").insert({
      id: correlationId,
      user_id: userId,
      agent_name: "budget_reallocator",
      status: "pending_approval",
      input: { recommendations: input.recommendations },
      output: {},
    });

    if (error) throw mapSupabaseError(error);

    revalidatePath("/dashboard/performance");
    return { status: "pending_approval", changes: input.recommendations };
  },
});
