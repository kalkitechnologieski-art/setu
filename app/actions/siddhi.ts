// app/actions/siddhi.ts
"use server";

import { withAction } from "@/lib/actions/guard";
import { ChatWithSiddhiSchema } from "@/lib/schemas/siddhi";
import { routeLLM, type LLMResult } from "@/lib/llm/router";
import { createAdminClient } from "@/lib/supabase/admin";

export const chatWithSiddhi = withAction({
  schema: ChatWithSiddhiSchema,
  handler: async (
    input,
    { userId, correlationId }
  ): Promise<LLMResult> => {
    const start = Date.now();
    const result = await routeLLM({
      messages: input.messages,
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Best-effort telemetry — never block the response on log failure
    try {
      const supabase = createAdminClient();
      await supabase.from("agent_runs").insert({
        id: correlationId,
        user_id: userId,
        agent_name: input.agentName,
        status: "completed",
        input: { messages: input.messages },
        output: { text: result.text, provider: result.provider },
        duration_ms: Date.now() - start,
      });
    } catch (e) {
      console.warn(`[siddhi:${correlationId}] telemetry failed`, e);
    }

    return result;
  },
});
