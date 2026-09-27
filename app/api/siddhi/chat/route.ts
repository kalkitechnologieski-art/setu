// app/api/siddhi/chat/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callSiddhiLLM } from "@/lib/siddhi/router";
import { executeTool } from "@/lib/siddhi/execute";
import { SIDDHI_SYSTEM_PROMPT } from "@/lib/siddhi/system-prompt";
import type { SiddhiMessage } from "@/lib/siddhi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

const MAX_ITERATIONS = 5;

export async function POST(request: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow anonymous trial chat — tools return empty data.
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const conversation: SiddhiMessage[] = [
    { role: "system", content: SIDDHI_SYSTEM_PROMPT },
    ...body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // Iterate: LLM → tool call → tool result → LLM → final text.
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let result;
    try {
      result = await callSiddhiLLM(conversation, true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "LLM unavailable";
      return NextResponse.json(
        { error: "llm_failed", message },
        { status: 500 }
      );
    }

    // If the LLM returned tool calls, execute them and loop.
    if (result.toolCalls && result.toolCalls.length > 0) {
      conversation.push({
        role: "assistant",
        content: result.text,
        tool_calls: result.toolCalls,
      });

      for (const tc of result.toolCalls) {
        const toolResult = await executeTool(
          tc.function.name,
          tc.function.arguments,
          userId
        );
        conversation.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_call_id: tc.id,
          name: tc.function.name,
        });
      }
      continue;
    }

    // No tool calls → this is the final answer.
    return NextResponse.json({
      ok: true,
      text: result.text,
      provider: result.provider,
      model: result.model,
    });
  }

  return NextResponse.json({
    ok: true,
    text: "I wasn't able to complete that request. Please try rephrasing.",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
  });
}
