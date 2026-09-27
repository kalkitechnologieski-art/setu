// lib/schemas/signal.ts
import { z } from "zod";

export const SignalUrgencySchema = z.enum(["low", "medium", "high", "critical"]);

export const CreateSignalSchema = z.object({
  lead_id: z.string().uuid().optional(),
  signal_type: z.string().trim().min(1).max(80),
  source: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  icp_score: z.number().int().min(0).max(100).optional(),
  urgency: SignalUrgencySchema.default("medium"),
  raw_data: z.record(z.string(), z.unknown()).default({}),
});

export type CreateSignalInput = z.infer<typeof CreateSignalSchema>;

