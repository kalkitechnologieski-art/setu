import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnifiedInbox } from "@/lib/ops/queries";
import { InboxItem, type InboxChannel } from "@/components/widgets/inbox-item";
import { EmptyState } from "@/components/ui/premium/empty-state";

export const dynamic = "force-dynamic";

const KIND_MAP: Record<string, InboxChannel> = {
  approval: "approval", signal: "signal", call: "call",
};

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/inbox");

  let items: Awaited<ReturnType<typeof getUnifiedInbox>> = [];
  try { items = await getUnifiedInbox(user.id, 50); }
  catch (e) { console.error("[inbox]", e); }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          {items.length === 0 ? "Every decision your workforce is waiting on, in one place." : `${items.length} item${items.length === 1 ? "" : "s"} waiting`}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Inbox} title="All caught up" description="No pending decisions. Your AI team will surface items here when they need your input." />
      ) : (
        <div className="rounded-2xl border bg-card p-3">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <InboxItem
                  channel={KIND_MAP[item.kind] ?? "approval"}
                  sender={item.agentSlug}
                  summary={`${item.title} — ${item.subtitle}`}
                  timestamp={new Date(item.timestamp).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                  confidence={item.confidence ?? undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
