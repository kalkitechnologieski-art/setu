"use server";

import { revalidatePath } from "next/cache";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import {
  CreateApprovalSchema,
  DecideApprovalSchema,
} from "@/lib/schemas/approval";
import { toJson } from "@/lib/types";
import type { Approval } from "@/lib/supabase/types";

export const createApproval = withAction({
  schema: CreateApprovalSchema,
  handler: async (input, { userId, supabase }): Promise<Approval> => {
    const { data, error } = await supabase
      .from("approvals")
      .insert({
        user_id: userId,
        agent_name: input.agent_name,
        action: input.action,
        payload: toJson(input.payload),
        reasoning: input.reasoning ?? null,
        confidence: input.confidence ?? null,
        expires_at: input.expires_at ?? null,
      })
      .select()
      .single();
    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Insert failed" });
    revalidatePath("/inbox");
    revalidatePath("/approvals");
    return data;
  },
});

export const decideApproval = withAction({
  schema: DecideApprovalSchema,
  handler: async (input, { userId, supabase }): Promise<Approval> => {
    const { data, error } = await supabase
      .from("approvals")
      .update({
        status: input.decision === "approve" ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by: userId,
        decision_reason: input.reason ?? null,
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Approval not found" });
    revalidatePath("/inbox");
    revalidatePath("/approvals");
    return data;
  },
});

