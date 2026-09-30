// hooks/use-siddhi-chat.ts
"use client";

import { useCallback, useState } from "react";

export interface ChatApproval {
  id: string;
  action: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  createdAt: number;
  approval?: ChatApproval | null;
}

export interface UseSiddhiChatResult {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  reset: () => void;
}

export function useSiddhiChat(): UseSiddhiChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed || sending) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setSending(true);
      setError(null);

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/siddhi/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          text: string;
          provider?: string;
          approval?: ChatApproval | null;
          degraded?: boolean;
        };
          text: string;
          provider?: string;
          approval?: ChatApproval | null;
        };

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.text,
            provider: data.provider,
            createdAt: Date.now(),
            approval: data.approval ?? null,
          },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: `I hit an error: ${msg}. Please try again.`,
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sending, error, send, reset };
}
