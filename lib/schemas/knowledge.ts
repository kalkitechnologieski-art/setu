// lib/schemas/knowledge.ts
import { z } from "zod";

export const CreateKnowledgeBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  scope: z
    .enum(["private", "shared_with_agents", "shared_with_team"])
    .default("private"),
});

export const CreateDocumentSchema = z.object({
  knowledge_base_id: z.string().uuid(),
  name: z.string().trim().min(1, "Document name is required").max(300),
  content: z.string().min(1, "Document content is required").max(500_000),
  mime_type: z.string().trim().max(100).default("text/plain"),
});

export const DeleteDocumentSchema = z.object({
  id: z.string().uuid(),
});

export const QueryKnowledgeSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  kb_ids: z.array(z.string().uuid()).optional(),
  match_count: z.number().int().min(1).max(20).default(5),
});

export type CreateKnowledgeBaseInput = z.infer<typeof CreateKnowledgeBaseSchema>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type QueryKnowledgeInput = z.infer<typeof QueryKnowledgeSchema>;
