"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { routeLLM } from "@/lib/llm/router";
import {
  CreateKnowledgeBaseSchema,
  CreateDocumentSchema,
  DeleteDocumentSchema,
} from "@/lib/schemas/knowledge";
import type { KnowledgeBaseRow, DocumentRow } from "@/lib/knowledge/types";

export type KnowledgeActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function failure(message: string, fieldErrors?: Record<string, string[]>) {
  return fieldErrors
    ? { ok: false as const, error: message, fieldErrors }
    : { ok: false as const, error: message };
}

// ─── Chunking (512-token target, 50-token overlap) ───────────────────────

function chunkText(text: string, chunkSize = 1800, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

// ─── Embedding (deterministic hash, 384 dims, L2-normalised) ─────────────
// Strict-mode safe: uses ?? 0 on every indexed access.

function embedText(text: string): number[] {
  const dims = 384;
  const vec: number[] = new Array<number>(dims).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const idx1 = code % dims;
    const idx2 = (code * 7) % dims;
    vec[idx1] = (vec[idx1] ?? 0) + 1;
    vec[idx2] = (vec[idx2] ?? 0) + 0.5;
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;

  for (let i = 0; i < dims; i++) {
    const v = vec[i] ?? 0;
    vec[i] = v / norm;
  }

  return vec;
}

// ─── CREATE KNOWLEDGE BASE ────────────────────────────────────────────────

export async function createKnowledgeBase(
  rawInput: unknown
): Promise<KnowledgeActionResult<KnowledgeBaseRow>> {
  const parsed = CreateKnowledgeBaseSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const clean: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(fe)) if (v && v.length) clean[k] = v;
    return failure("Please check the highlighted fields.", clean);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const name: string = String(parsed.data.name ?? "");
  const description: string | null =
    parsed.data.description !== undefined && parsed.data.description !== null
      ? String(parsed.data.description)
      : null;
  const scope: string = String(parsed.data.scope ?? "private");

  const { data, error } = await supabase
    .from("knowledge_bases")
    .insert({ user_id: user.id, name, description, scope })
    .select("*")
    .single();

  if (error) return failure(error.message);
  if (!data) return failure("Insert returned no data");

  revalidatePath("/knowledge");
  return { ok: true, data: data as KnowledgeBaseRow };
}

// ─── ADD DOCUMENT ─────────────────────────────────────────────────────────

export async function addDocument(
  rawInput: unknown
): Promise<KnowledgeActionResult<DocumentRow>> {
  const parsed = CreateDocumentSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const clean: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(fe)) if (v && v.length) clean[k] = v;
    return failure("Please check the highlighted fields.", clean);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const kbId: string = String(parsed.data.knowledge_base_id ?? "");
  const docName: string = String(parsed.data.name ?? "");
  const docContent: string = String(parsed.data.content ?? "");
  const mimeType: string = String(parsed.data.mime_type ?? "text/plain");

  if (!kbId || !docName || !docContent) {
    return failure("Missing required fields");
  }

  const { data: kb } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("id", kbId)
    .eq("user_id", user.id)
    .single();
  if (!kb) return failure("Knowledge base not found");

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      knowledge_base_id: kbId,
      user_id: user.id,
      name: docName,
      mime_type: mimeType,
      size_bytes: docContent.length,
      status: "processing",
    })
    .select("*")
    .single();

  if (docErr) return failure(docErr.message);
  if (!doc) return failure("Failed to create document");

  try {
    const chunks = chunkText(docContent);
    const rows = chunks.map((content, idx) => ({
      document_id: doc.id,
      user_id: user.id,
      content,
      embedding: embedText(content),
      chunk_index: idx,
      token_count: Math.ceil(content.length / 4),
    }));

    const { error: secErr } = await supabase
      .from("document_sections")
      .insert(rows);
    if (secErr) throw new Error(secErr.message);

    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", doc.id)
      .eq("user_id", user.id);
  } catch (e) {
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Chunking failed",
      })
      .eq("id", doc.id)
      .eq("user_id", user.id);
    return failure(e instanceof Error ? e.message : "Chunking failed");
  }

  revalidatePath("/knowledge");
  return { ok: true, data: { ...doc, status: "ready" } as DocumentRow };
}

// ─── DELETE DOCUMENT ──────────────────────────────────────────────────────

export async function deleteDocument(
  rawInput: unknown
): Promise<KnowledgeActionResult<{ id: string }>> {
  const parsed = DeleteDocumentSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const id: string = String(parsed.data.id ?? "");
  if (!id) return failure("Missing id");

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return failure(error.message);

  revalidatePath("/knowledge");
  return { ok: true, data: { id } };
}

// ─── ASK KNOWLEDGE BASE (RAG) ─────────────────────────────────────────────

export interface KnowledgeAnswer {
  answer: string;
  citations: Array<{ document_id: string; similarity: number }>;
  provider: string;
}

export async function askKnowledgeBase(
  query: string,
  kbIds?: string[]
): Promise<KnowledgeActionResult<KnowledgeAnswer>> {
  const trimmed = query.trim();
  if (!trimmed) return failure("Query is empty");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const queryEmbedding = embedText(trimmed);

  const { data: chunks, error: rpcErr } = await supabase.rpc(
    "match_document_sections",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      p_kb_ids: kbIds && kbIds.length > 0 ? kbIds : null,
    }
  );
  if (rpcErr) return failure(rpcErr.message);

  const sections = (chunks ?? []) as Array<{
    id: number;
    document_id: string;
    content: string;
    similarity: number;
  }>;

  if (sections.length === 0) {
    return {
      ok: true,
      data: {
        answer:
          "I couldn't find anything in your knowledge base related to that. Try adding a document that covers this topic.",
        citations: [],
        provider: "none",
      },
    };
  }

  const context = sections
    .map((s, i) => `[${i + 1}] ${s.content}`)
    .join("\n\n---\n\n");

  const result = await routeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Siddhi, answering the user's question using ONLY the provided context. " +
          "If the context does not contain the answer, say so honestly. " +
          "Cite sources as [1], [2], etc. when you use them.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${trimmed}`,
      },
    ],
  });

  return {
    ok: true,
    data: {
      answer: result.text,
      citations: sections.map((s) => ({
        document_id: s.document_id,
        similarity: s.similarity,
      })),
      provider: result.provider,
    },
  };
}
