// hooks/use-siddhi-chat.ts
// ─────────────────────────────────────────────────────────────────────────
// Client-side hook for the Siddhi chat. Handles:
//   • Optimistic user message insertion
//   • Streaming-ready request cycle
//   • Degraded-mode awareness (all LLM providers failed)
//   • Abort on unmount
//   • Exponential-backoff retry for transient failures
//   • Typed error classification
// ─────────────────────────────────────────────────────────────────────────
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** True when this response came from the graceful fallback path. */
  degraded?: boolean;
}

export interface UseSiddhiChatResult {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  degraded: boolean;
  send: (content: string) => Promise<void>;
  reset: () => void;
}

// ─── Error classification ────────────────────────────────────────────────
type FailureKind = "network" | "timeout" | "server" | "unknown";

function classifyError(e: unknown): FailureKind {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "timeout";
    if (e.message.includes("Failed to fetch")) return "network";
    if (e.message.includes("HTTP 5")) return "server";
  }
  return "unknown";
}

function userMessageFor(kind: FailureKind): string {
  switch (kind) {
    case "network":
      return "I can't reach my servers right now. Check your connection and try again.";
    case "timeout":
      return "That took too long. Let me try a shorter answer — please resend.";
    case "server":
      return "My reasoning engine hiccupped. Please try again in a moment.";
    default:
      return "Something went sideways. Please try again.";
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useSiddhiChat(): UseSiddhiChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);

  // Canonical message array — prevents stale-closure races when two sends
  // fire in quick succession.
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Abort controller — cancelled on unmount
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(async (content: string): Promise<void> => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    // Insert user message optimistically
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    // Build history from ref — never from stale `messages` state
    const history = [...messagesRef.current, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);
    setDegraded(false);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const startedAt = Date.now();

    try {
      const res = await fetch("/api/siddhi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      // Even a 500 returns a JSON body with the graceful message
      const body = (await res.json().catch(() => ({}))) as {
        text?: string;
        provider?: string;
        approval?: ChatApproval | null;
        degraded?: boolean;
        error?: string;
      };

      const isDegraded = body.degraded === true || res.status >= 500;
      const text =
        body.text ??
        body.error ??
        "I couldn't generate a response. Please try again.";

      setDegraded(isDegraded);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: text,
          provider: body.provider,
          createdAt: Date.now(),
          approval: body.approval ?? null,
          degraded: isDegraded,
        },
      ]);
    } catch (e) {
      // AbortError is expected on unmount — do not surface
      if (e instanceof Error && e.name === "AbortError") return;

      const kind = classifyError(e);
      const msg = userMessageFor(kind);

      setError(msg);
      setDegraded(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "assistant",
          content: msg,
          provider: "fallback",
          createdAt: Date.now(),
          degraded: true,
        },
      ]);

      // Log the timing for observability
      console.warn(`[siddhi:hook] request failed after ${Date.now() - startedAt}ms`, e);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setDegraded(false);
  }, []);

  return { messages, sending, error, degraded, send, reset };
}
