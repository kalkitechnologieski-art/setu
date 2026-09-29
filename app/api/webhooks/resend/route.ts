import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailAdapter } from "@/lib/inbox/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Persist webhook event for replay
    const admin = createAdminClient();
    await admin.from("webhook_events").insert({
      source: "resend",
      event_type: payload?.type ?? "unknown",
      payload,
      status: "received",
    });

    // Normalise to canonical message
    const message = emailAdapter.normalise(payload);
    if (message) {
      const { data: lead } = await admin
        .from("leads")
        .select("id, user_id")
        .eq("email", message.senderHandle)
        .maybeSingle();

      if (lead) {
        // Create or find conversation
        const { data: conv } = await admin
          .from("conversations")
          .select("id")
          .eq("user_id", lead.user_id)
          .eq("channel", "email")
          .eq("lead_id", lead.id)
          .eq("status", "open")
          .maybeSingle();

        let conversationId = conv?.id;

        if (!conversationId) {
          const { data: newConv } = await admin
            .from("conversations")
            .insert({
              user_id: lead.user_id,
              lead_id: lead.id,
              channel: "email",
              status: "open",
              last_message_at: message.receivedAt,
              last_message_preview: message.content.slice(0, 200),
            })
            .select("id")
            .single();
          conversationId = newConv?.id;
        }

        if (conversationId) {
          await admin.from("conversation_messages").insert({
            conversation_id: conversationId,
            direction: "inbound",
            sender_type: "contact",
            sender_name: message.senderName,
            content: message.content,
            channel_message_id: message.channelMessageId,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Always return 200 — webhook retries would spam
    return NextResponse.json({ ok: true });
  }
}
