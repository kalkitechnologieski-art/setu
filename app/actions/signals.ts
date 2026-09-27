"use server";

import { revalidatePath } from "next/cache";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import { CreateSignalSchema } from "@/lib/schemas/signal";
import { toJson } from "@/lib/types";
import type { Signal } from "@/lib/supabase/types";

export const createSignal = withAction({
  schema: CreateSignalSchema,
  handler: async (input, { userId, supabase }): Promise<Signal> => {
    const { data, error } = await supabase
      .from("signals")
      .insert({
        user_id: userId,
        lead_id: input.lead_id ?? null,
        signal_type: input.signal_type,
        source: input.source,
        title: input.title,
        description: input.description ?? null,
        icp_score: input.icp_score ?? null,
        urgency: input.urgency,
        raw_data: toJson(input.raw_data),
      })
      .select()
      .single();
    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Insert failed" });
    revalidatePath("/signals");
    return data;
  },
});

