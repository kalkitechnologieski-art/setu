import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { classifyReply } from "@/lib/reply-classifier/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BodySchema = z.object({
  text: z.string().min(1).max(20_000),
  conversation_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const result = await classifyReply(parsed.data.text);

    // Update conversation sentiment (best-effort)
    if (parsed.data.conversation_id) {
      const sentiment =
        result.intent === "INTERESTED" ? "positive"
        : result.intent === "NOT_INTERESTED" || result.intent === "UNSUBSCRIBE" ? "negative"
        : "neutral";

      await supabase
        .from("conversations")
        .update({ sentiment })
        .eq("id", parsed.data.conversation_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ classification: result });
  } catch {
    // Never fail the client — return heuristic fallback
    return NextResponse.json({
      classification: {
        intent: "OTHER",
        confidence: 0.4,
        suggestedAction: "Route to human",
        source: "heuristic",
      },
    });
  }
}
