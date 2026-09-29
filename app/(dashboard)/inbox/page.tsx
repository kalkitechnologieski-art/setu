import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PremiumEmpty } from "@/components/shared/premium-empty";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { ConversationList } from "@/components/inbox/conversation-list";
import type { Conversation } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inbox");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const typed = (conversations ?? []) as Conversation[];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            {typed.length === 0
              ? "Every channel in one place — WhatsApp, email, Instagram, Messenger."
              : `${typed.length} conversation${typed.length === 1 ? "" : "s"} across all channels.`}
          </p>
        </div>
      </div>

      <WidgetBoundary label="Inbox">
        {typed.length === 0 ? (
          <PremiumEmpty
            icon={Inbox}
            eyebrow="Omnichannel"
            title="No conversations yet"
            description="When a lead replies on WhatsApp, email, Instagram, or Messenger, the thread appears here with full history and AI-drafted replies."
            primaryAction={{ label: "Connect WhatsApp", variant: "gradient", href: "/connect" }}
            secondaryAction={{ label: "View leads", variant: "outline", href: "/leads" }}
          />
        ) : (
          <ConversationList initialConversations={typed} />
        )}
      </WidgetBoundary>
    </div>
  );
}
