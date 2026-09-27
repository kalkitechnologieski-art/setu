// lib/knowledge/types.ts
import type { Database } from "@/lib/supabase/types";

export type KnowledgeBaseRow =
  Database["public"]["Tables"]["knowledge_bases"]["Row"];
export type DocumentRow =
  Database["public"]["Tables"]["documents"]["Row"];

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export const STATUS_STYLE: Record<DocumentStatus, string> = {
  pending:    "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ready:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed:     "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  pending:    "Pending",
  processing: "Processing",
  ready:      "Ready",
  failed:     "Failed",
};
