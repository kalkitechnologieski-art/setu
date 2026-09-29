// lib/realtime/use-conversations.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ConversationRow {
  id: string;
  channel: string;
  status: string;
  priority: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export function useConversations(userId: string | null) {
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setItems([]); setLoading(false); return; }

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from("conversations")
        .select("id, channel, status, priority, last_message_preview, last_message_at, unread_count")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false })
        .limit(50);

      if (!cancelled) {
        setItems((data ?? []) as ConversationRow[]);
        setLoading(false);
      }

      const channel = supabase
        .channel(`conversations:${userId}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as ConversationRow, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((c) => (c.id === (payload.new as ConversationRow).id ? payload.new as ConversationRow : c))
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            setItems((prev) => prev.filter((c) => c.id !== old.id));
          }
        })
        .subscribe();

      unsub = () => { void supabase.removeChannel(channel); };
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [userId]);

  return { items, loading };
}
