"use server";

import { revalidatePath } from "next/cache";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import {
  CreateCampaignSchema,
  UpdateCampaignStatusSchema,
} from "@/lib/schemas/campaign";
import { toJson } from "@/lib/types";
import type { Campaign, CampaignInsert } from "@/lib/supabase/types";

export const createCampaign = withAction({
  schema: CreateCampaignSchema,
  handler: async (input, { userId, supabase }): Promise<Campaign> => {
    const payload: CampaignInsert = {
      user_id: userId,
      name: input.name,
      type: input.type,
      status: input.status,
      workflow: toJson(input.workflow),
    };

    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Insert returned no data" });

    revalidatePath("/dashboard/campaigns");
    return data;
  },
});

export const updateCampaignStatus = withAction({
  schema: UpdateCampaignStatusSchema,
  handler: async ({ id, status }, { userId, supabase }): Promise<Campaign> => {
    const { data, error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Campaign not found" });

    revalidatePath("/dashboard/campaigns");
    return data;
  },
});

