// lib/schemas/lead.ts
// ═══════════════════════════════════════════════════════════════════════════
// Zod schemas for lead operations — shared between client (RHF resolver) and
// server (Server Action validation). One schema, one source of truth.
// ═══════════════════════════════════════════════════════════════════════════
import { z } from "zod";

export const LeadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);

export const CreateLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\-\s()]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  source: z.string().trim().min(1, "Source is required").max(100),
  score: z.coerce.number().int().min(0).max(100).default(0),
  status: LeadStatusSchema.default("new"),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

export const LeadQuerySchema = z.object({
  status: LeadStatusSchema.optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().datetime().optional(),
});

export type LeadQueryInput = z.infer<typeof LeadQuerySchema>;
