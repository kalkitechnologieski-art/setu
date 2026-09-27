// lib/schemas/content.ts
import { z } from "zod";

export const PlatformSchema = z.enum([
  "instagram", "facebook", "youtube", "linkedin", "tiktok",
]);

export const CreatePostSchema = z.object({
  title: z.string().trim().max(200).default(""),
  body: z.string().trim().min(1, "Post body is required").max(5000),
  platforms: z.array(PlatformSchema).min(1, "Select at least one platform"),
  scheduled_for: z.string().datetime().nullable().optional(),
  require_approval: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const UpdatePostStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "draft", "pending_approval", "scheduled",
    "published", "rejected", "failed",
  ]),
  rejection_reason: z.string().trim().max(500).optional(),
});

export const DeletePostSchema = z.object({
  id: z.string().uuid(),
});
