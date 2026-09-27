// lib/knowledge/queries.ts
import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseRow, DocumentRow } from "./types";

export async function listKnowledgeBases(
  userId: string
): Promise<KnowledgeBaseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as KnowledgeBaseRow[];
}

export async function listDocuments(
  userId: string,
  kbId: string
): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .eq("knowledge_base_id", kbId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DocumentRow[];
}

export interface KnowledgeStats {
  knowledgeBases: number;
  documents: number;
  sections: number;
  readyDocuments: number;
}

export async function getKnowledgeStats(
  userId: string
): Promise<KnowledgeStats> {
  const supabase = await createClient();

  const [kbRes, docRes, sectionRes] = await Promise.all([
    supabase
      .from("knowledge_bases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("documents")
      .select("id, status")
      .eq("user_id", userId),
    supabase
      .from("document_sections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const docs = docRes.data ?? [];
  return {
    knowledgeBases: kbRes.count ?? 0,
    documents: docs.length,
    sections: sectionRes.count ?? 0,
    readyDocuments: docs.filter((d) => d.status === "ready").length,
  };
}

export interface RAGChunk {
  id: number;
  document_id: string;
  content: string;
  similarity: number;
}

export async function searchKnowledge(
  userId: string,
  queryEmbedding: number[],
  kbIds: string[] | null,
  matchCount = 5
): Promise<RAGChunk[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_document_sections", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: matchCount,
    p_kb_ids: kbIds,
  });
  if (error) return [];
  void userId;
  return (data ?? []) as RAGChunk[];
}
