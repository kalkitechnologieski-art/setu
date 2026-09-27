// lib/schemas/approval.ts
import { z } from "zod";

export const ApprovalStatusSchema = z.enum([
  "pending", "approved", "rejected", "expired",
]);

export const CreateApprovalSchema = z.object({
  agent_name: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).default({}),
  reasoning: z.string().trim().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  expires_at: z.string().datetime().optional(),
});

export type CreateApprovalInput = z.infer<typeof CreateApprovalSchema>;

export const DecideApprovalSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1000).optional(),
});

export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>;

