// lib/schemas/campaign.ts
import { z } from "zod";

export const CampaignTypeSchema = z.enum([
  "email",
  "call",
  "multi_channel",
  "paid_ads",
]);

export const CampaignStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
]);

// Workflow is a free-form JSON graph. We keep the Zod side loose (`unknown`)
// and convert to the Json union with toJson() at the persistence boundary —
// TypeScript enforces the conversion, runtime keeps the exact shape.
const WorkflowSchema = z
  .object({
    nodes: z.array(z.unknown()).default([]),
    edges: z.array(z.unknown()).default([]),
  })
  .default({ nodes: [], edges: [] });

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: CampaignTypeSchema,
  status: CampaignStatusSchema.default("draft"),
  workflow: WorkflowSchema,
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignStatusSchema = z.object({
  id: z.string().uuid(),
  status: CampaignStatusSchema,
});

export type UpdateCampaignStatusInput = z.infer<
  typeof UpdateCampaignStatusSchema
>;

