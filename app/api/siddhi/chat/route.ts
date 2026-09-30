// app/api/siddhi/chat/route.ts
// Contract: ALWAYS return 200 with a valid response. NEVER expose raw errors.

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
  // ─── Parse body ────────────────────────────────────────────────────────
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: true,
        text: "I couldn't parse that request. Please try sending your message again.",
        provider: "fallback",
        model: "fallback",
        degraded: true,
      },
      { status: 200 }
    );
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        text: "I didn't receive a message. Please type something and try again.",
        provider: "fallback",
        model: "fallback",
        degraded: true,
      },
      { status: 200 }
    );
  }

  // ─── Resolve user (best-effort, never block) ───────────────────────────
  let userId = "00000000-0000-0000-0000-000000000000";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) userId = user.id;
  } catch {
    /* anonymous is fine — tools will return empty results */
  }

  const conversation: SiddhiMessage[] = [
    { role: "system", content: SIDDHI_SYSTEM_PROMPT },
    ...body.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  let approvalCreated: { id: string; action: string } | null = null;

  // ─── Tool-calling loop ─────────────────────────────────────────────────
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let result;
    try {
      result = await callSiddhiLLM(conversation, true);
    } catch (e) {
      // Even callSiddhiLLM catches internally, but belt-and-suspenders
      console.error("[siddhi:chat] LLM call threw unexpectedly:", e);
      return NextResponse.json(
        {
          ok: true,
          text: "My reasoning engine hiccupped. Please try again in a moment.",
          provider: "fallback",
          model: "fallback",
          degraded: true,
        },
        { status: 200 }
      );
    }

    // Fallback path (no tool calls)
    if (result.model === "fallback") {
      return NextResponse.json(
        {
          ok: true,
          text: result.text,
          provider: result.provider,
          model: result.model,
          degraded: true,
          approval: approvalCreated,
        },
        { status: 200 }
      );
    }

    if (result.toolCalls && result.toolCalls.length > 0) {
      conversation.push({
        role: "assistant",
        content: result.text,
        tool_calls: result.toolCalls,
      });

      for (const tc of result.toolCalls) {
        let toolResult;
        try {
          toolResult = await executeTool(tc.function.name, tc.function.arguments, userId);
        } catch (e) {
          console.error("[siddhi:chat] Tool execution threw:", e);
          toolResult = { ok: false, error: "Tool execution failed" };
        }

        if (
          toolResult.ok &&
          typeof toolResult.data === "object" &&
          toolResult.data !== null &&
          "status" in toolResult.data &&
          (toolResult.data as { status?: string }).status === "pending_approval"
        ) {
          const d = toolResult.data as { approval_id?: string; action?: string };
          approvalCreated = {
            id: d.approval_id ?? "",
            action: d.action ?? "Pending action",
          };
        }

        conversation.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_call_id: tc.id,
          name: tc.function.name,
        });
      }
      continue;
    }

    // Normal response path
    return NextResponse.json(
      {
        ok: true,
        text: result.text || "I don't have a response for that.",
        provider: result.provider,
        model: result.model,
        approval: approvalCreated,
      },
      { status: 200 }
    );
  }

  // Iteration limit reached
  return NextResponse.json(
    {
      ok: true,
      text: "I wasn't able to complete that request. Try rephrasing.",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      approval: approvalCreated,
    },
    { status: 200 }
  );
}
