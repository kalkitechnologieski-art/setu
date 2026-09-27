// lib/schemas/siddhi.ts
import { z } from "zod";

export const ChatRoleSchema = z.enum(["system", "user", "assistant"]);

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().min(1).max(20_000),
});

export const ChatWithSiddhiSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  agentName: z.string().trim().max(100).default("siddhi-supervisor"),
});

export type ChatWithSiddhiInput = z.infer<typeof ChatWithSiddhiSchema>;
