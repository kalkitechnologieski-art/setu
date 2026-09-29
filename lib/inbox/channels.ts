// lib/inbox/channels.ts
// Channel adapter — normalises inbound payloads into a canonical conversation.

export type ChannelKey =
  | "whatsapp" | "email" | "instagram_dm"
  | "facebook_messenger" | "threads" | "sms" | "web_chat";

export interface CanonicalMessage {
  channel: ChannelKey;
  channelMessageId: string;
  direction: "inbound" | "outbound";
  senderName: string;
  senderHandle: string;
  content: string;
  attachments: Array<{ type: string; url: string; name?: string }>;
  receivedAt: string;
}

export interface ChannelAdapter {
  key: ChannelKey;
  label: string;
  icon: string;
  normalise(payload: unknown): CanonicalMessage | null;
  buildOutbound(body: string, to: string): Promise<unknown>;
}

// WhatsApp adapter (Cloud API webhook)
export const whatsappAdapter: ChannelAdapter = {
  key: "whatsapp",
  label: "WhatsApp",
  icon: "message-circle",
  normalise(payload) {
    try {
      const p = payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[]; contacts?: unknown[] } }> }> };
      const change = p.entry?.[0]?.changes?.[0]?.value;
      const msg = (change?.messages?.[0] ?? null) as { id?: string; from?: string; text?: { body?: string }; type?: string } | null;
      const contact = (change?.contacts?.[0] ?? null) as { profile?: { name?: string }; wa_id?: string } | null;
      if (!msg) return null;
      return {
        channel: "whatsapp",
        channelMessageId: msg.id ?? "",
        direction: "inbound",
        senderName: contact?.profile?.name ?? "WhatsApp contact",
        senderHandle: contact?.wa_id ?? msg.from ?? "",
        content: msg.text?.body ?? `[${msg.type ?? "message"}]`,
        attachments: [],
        receivedAt: new Date().toISOString(),
      };
    } catch { return null; }
  },
  async buildOutbound(body, to) {
    const url = process.env.MODAL_ENDPOINT_URL;
    const key = process.env.MODAL_PROXY_KEY;
    const secret = process.env.MODAL_PROXY_SECRET;
    if (!url || !key || !secret) throw new Error("Modal endpoint not configured");
    const res = await fetch(`${url.replace(/\/$/, "")}/v1/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Modal-Key": key, "Modal-Secret": secret },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status}`);
    return res.json();
  },
};

// Email adapter (Resend webhook)
export const emailAdapter: ChannelAdapter = {
  key: "email",
  label: "Email",
  icon: "mail",
  normalise(payload) {
    try {
      const p = payload as { type?: string; data?: { email_id?: string; from?: string; subject?: string; text?: string } };
      if (p.type !== "email.received") return null;
      const d = p.data ?? {};
      return {
        channel: "email",
        channelMessageId: d.email_id ?? "",
        direction: "inbound",
        senderName: (d.from ?? "").split("@")[0] ?? "Contact",
        senderHandle: d.from ?? "",
        content: d.text ?? d.subject ?? "",
        attachments: [],
        receivedAt: new Date().toISOString(),
      };
    } catch { return null; }
  },
  async buildOutbound(body, to) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@setu-kalki.app",
        to,
        subject: "Re: your message",
        text: body,
      }),
    });
    if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
    return res.json();
  },
};

export const ADAPTERS: Record<ChannelKey, ChannelAdapter> = {
  whatsapp: whatsappAdapter,
  email: emailAdapter,
  instagram_dm: { ...emailAdapter, key: "instagram_dm", label: "Instagram", icon: "instagram" },
  facebook_messenger: { ...emailAdapter, key: "facebook_messenger", label: "Messenger", icon: "facebook" },
  threads: { ...emailAdapter, key: "threads", label: "Threads", icon: "at-sign" },
  sms: { ...emailAdapter, key: "sms", label: "SMS", icon: "message-square" },
  web_chat: { ...emailAdapter, key: "web_chat", label: "Web Chat", icon: "globe" },
};

export function resolveAdapter(key: string): ChannelAdapter | null {
  return (ADAPTERS as Record<string, ChannelAdapter | undefined>)[key] ?? null;
}
