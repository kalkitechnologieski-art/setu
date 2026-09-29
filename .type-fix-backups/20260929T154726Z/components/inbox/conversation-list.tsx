"use client";

import { useState, useMemo } from "react";
import { Search, MessageCircle, Mail, Instagram, Facebook, AtSign, Globe, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/supabase/types";

const CHANNEL_ICON: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  instagram_dm: Instagram,
  facebook_messenger: Facebook,
  threads: AtSign,
  sms: MessageSquare,
  web_chat: Globe,
};

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  email: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  instagram_dm: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  facebook_messenger: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  threads: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  sms: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  web_chat: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  normal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  negative: "bg-rose-500",
  frustrated: "bg-rose-600",
};

export function ConversationList({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return initialConversations;
    const q = search.toLowerCase();
    return initialConversations.filter(
      (c) =>
        (c.subject ?? "").toLowerCase().includes(q) ||
        (c.last_message_preview ?? "").toLowerCase().includes(q) ||
        c.channel.toLowerCase().includes(q)
    );
  }, [initialConversations, search]);

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="grid h-[calc(100vh-16rem)] grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* Left: list */}
      <div className="flex flex-col overflow-hidden rounded-2xl border bg-card/40">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ul className="flex-1 divide-y overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-12 text-center text-xs text-muted-foreground">
              No conversations match your search.
            </li>
          ) : (
            filtered.map((conv) => {
              const Icon = CHANNEL_ICON[conv.channel] ?? MessageCircle;
              const active = conv.id === selected?.id;
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      "w-full px-3 py-3 text-left transition-colors",
                      active ? "bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", CHANNEL_COLOR[conv.channel])}>
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium capitalize">
                            {conv.subject ?? conv.channel.replace("_", " ")}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {conv.last_message_at
                              ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {conv.last_message_preview ?? "No messages yet"}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_STYLE[conv.priority])}>
                            {conv.priority}
                          </span>
                          {conv.sentiment && (
                            <span className={cn("h-1.5 w-1.5 rounded-full", SENTIMENT_DOT[conv.sentiment])} />
                          )}
                          {conv.unread_count > 0 && (
                            <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Right: detail */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card/40 lg:block">
        {selected ? (
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", CHANNEL_COLOR[selected.channel])}>
                  {(() => {
                    const Icon = CHANNEL_ICON[selected.channel] ?? MessageCircle;
                    return <Icon className="size-4" />;
                  })()}
                </div>
                <div>
                  <div className="text-sm font-semibold capitalize">
                    {selected.subject ?? selected.channel.replace("_", " ")}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {selected.channel.replace("_", " ")} · {selected.status}
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="rounded-xl border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                Message thread loads here with realtime updates.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
