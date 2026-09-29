// lib/supabase/types.ts
// ═══════════════════════════════════════════════════════════════════════════
// Canonical database types — 22 tables.
//
// Regenerate from a linked project (preferred when keys are available):
//   npx supabase gen types typescript --project-id <ref> --schema public \
//     > lib/supabase/types.ts
//
// CRITICAL canonical rules:
//   • Every table ends with `Relationships: []`
//   • Views/Enums/CompositeTypes use `{ [_ in never]: never }`
//   • Database is a `type` (not `interface`)
//   • Functions section lists RPC-callable functions only
// ═══════════════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; plan: string; settings: Json; created_at: string; updated_at: string };
        Insert: { id: string; email: string; full_name?: string | null; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; email?: string; full_name?: string | null; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      leads: {
        Row: { id: string; user_id: string; name: string | null; email: string | null; phone: string | null; company: string | null; title: string | null; score: number; status: string; source: string; enriched_data: Json; icp_embedding: number[] | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; title?: string | null; score?: number; status?: string; source: string; enriched_data?: Json; icp_embedding?: number[] | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; title?: string | null; score?: number; status?: string; source?: string; enriched_data?: Json; icp_embedding?: number[] | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      campaigns: {
        Row: { id: string; user_id: string; name: string; status: string; type: string; workflow: Json; metrics: Json; markifact_campaign_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; status?: string; type: string; workflow?: Json; metrics?: Json; markifact_campaign_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; status?: string; type?: string; workflow?: Json; metrics?: Json; markifact_campaign_id?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      emails: {
        Row: { id: string; lead_id: string; campaign_id: string | null; subject: string | null; body: string | null; status: string; resend_id: string | null; sent_at: string | null; opened_at: string | null; created_at: string };
        Insert: { id?: string; lead_id: string; campaign_id?: string | null; subject?: string | null; body?: string | null; status?: string; resend_id?: string | null; sent_at?: string | null; opened_at?: string | null; created_at?: string };
        Update: { id?: string; lead_id?: string; campaign_id?: string | null; subject?: string | null; body?: string | null; status?: string; resend_id?: string | null; sent_at?: string | null; opened_at?: string | null; created_at?: string };
        Relationships: [];
      };
      calls: {
        Row: { id: string; lead_id: string; agentcall_id: string | null; direction: string; transcript: string | null; summary: string | null; sentiment: string | null; action_items: Json; duration_seconds: number | null; created_at: string };
        Insert: { id?: string; lead_id: string; agentcall_id?: string | null; direction: string; transcript?: string | null; summary?: string | null; sentiment?: string | null; action_items?: Json; duration_seconds?: number | null; created_at?: string };
        Update: { id?: string; lead_id?: string; agentcall_id?: string | null; direction?: string; transcript?: string | null; summary?: string | null; sentiment?: string | null; action_items?: Json; duration_seconds?: number | null; created_at?: string };
        Relationships: [];
      };
      ad_performance: {
        Row: { id: number; user_id: string; platform: string; campaign_name: string | null; spend: number; impressions: number; clicks: number; conversions: number; roas: number; synced_at: string };
        Insert: { id?: number; user_id: string; platform: string; campaign_name?: string | null; spend?: number; impressions?: number; clicks?: number; conversions?: number; roas?: number; synced_at?: string };
        Update: { id?: number; user_id?: string; platform?: string; campaign_name?: string | null; spend?: number; impressions?: number; clicks?: number; conversions?: number; roas?: number; synced_at?: string };
        Relationships: [];
      };
      agent_runs: {
        Row: { id: string; user_id: string; agent_name: string; status: string; input: Json; output: Json; tokens_used: number; duration_ms: number; created_at: string };
        Insert: { id?: string; user_id: string; agent_name: string; status?: string; input?: Json; output?: Json; tokens_used?: number; duration_ms?: number; created_at?: string };
        Update: { id?: string; user_id?: string; agent_name?: string; status?: string; input?: Json; output?: Json; tokens_used?: number; duration_ms?: number; created_at?: string };
        Relationships: [];
      };
      job_queue: {
        Row: { id: number; user_id: string | null; job_type: string; payload: Json; status: string; locked_at: string | null; locked_by: string | null; retries: number; created_at: string };
        Insert: { id?: number; user_id?: string | null; job_type: string; payload?: Json; status?: string; locked_at?: string | null; locked_by?: string | null; retries?: number; created_at?: string };
        Update: { id?: number; user_id?: string | null; job_type?: string; payload?: Json; status?: string; locked_at?: string | null; locked_by?: string | null; retries?: number; created_at?: string };
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; count: number; window_start: string };
        Insert: { key: string; count?: number; window_start?: string };
        Update: { key?: string; count?: number; window_start?: string };
        Relationships: [];
      };
      approvals: {
        Row: { id: string; user_id: string; agent_name: string; action: string; payload: Json; reasoning: string | null; confidence: number | null; status: string; decided_at: string | null; decided_by: string | null; decision_reason: string | null; expires_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; agent_name: string; action: string; payload?: Json; reasoning?: string | null; confidence?: number | null; status?: string; decided_at?: string | null; decided_by?: string | null; decision_reason?: string | null; expires_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; agent_name?: string; action?: string; payload?: Json; reasoning?: string | null; confidence?: number | null; status?: string; decided_at?: string | null; decided_by?: string | null; decision_reason?: string | null; expires_at?: string | null; created_at?: string };
        Relationships: [];
      };
      signals: {
        Row: { id: string; user_id: string; lead_id: string | null; signal_type: string; source: string; title: string; description: string | null; icp_score: number | null; urgency: string | null; raw_data: Json; created_at: string };
        Insert: { id?: string; user_id: string; lead_id?: string | null; signal_type: string; source: string; title: string; description?: string | null; icp_score?: number | null; urgency?: string | null; raw_data?: Json; created_at?: string };
        Update: { id?: string; user_id?: string; lead_id?: string | null; signal_type?: string; source?: string; title?: string; description?: string | null; icp_score?: number | null; urgency?: string | null; raw_data?: Json; created_at?: string };
        Relationships: [];
      };
      agent_costs: {
        Row: { id: number; user_id: string; agent_name: string; date: string; runs: number; tokens_in: number; tokens_out: number; cost_usd: number };
        Insert: { id?: number; user_id: string; agent_name: string; date?: string; runs?: number; tokens_in?: number; tokens_out?: number; cost_usd?: number };
        Update: { id?: number; user_id?: string; agent_name?: string; date?: string; runs?: number; tokens_in?: number; tokens_out?: number; cost_usd?: number };
        Relationships: [];
      };
      platform_connections: {
        Row: { id: string; user_id: string; provider: string; provider_account_id: string | null; provider_account_name: string | null; access_token_secret_id: string | null; refresh_token_secret_id: string | null; scopes: string[]; token_type: string; expires_at: string | null; last_refresh_at: string | null; last_refresh_error: string | null; status: string; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; provider: string; provider_account_id?: string | null; provider_account_name?: string | null; access_token_secret_id?: string | null; refresh_token_secret_id?: string | null; scopes?: string[]; token_type?: string; expires_at?: string | null; last_refresh_at?: string | null; last_refresh_error?: string | null; status?: string; metadata?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; provider?: string; provider_account_id?: string | null; provider_account_name?: string | null; access_token_secret_id?: string | null; refresh_token_secret_id?: string | null; scopes?: string[]; token_type?: string; expires_at?: string | null; last_refresh_at?: string | null; last_refresh_error?: string | null; status?: string; metadata?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      auth_events: {
        Row: { id: number; user_id: string | null; event_type: string; provider: string | null; metadata: Json; created_at: string };
        Insert: { id?: number; user_id?: string | null; event_type: string; provider?: string | null; metadata?: Json; created_at?: string };
        Update: { id?: number; user_id?: string | null; event_type?: string; provider?: string | null; metadata?: Json; created_at?: string };
        Relationships: [];
      };
      agent_registry: {
        Row: { id: string; user_id: string; slug: string; name: string; role: string; description: string | null; icon: string; accent: string; color: string; autonomy: string; status: string; capabilities: string[]; max_daily_runs: number; max_daily_cost_usd: number; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; slug: string; name: string; role: string; description?: string | null; icon?: string; accent?: string; color?: string; autonomy?: string; status?: string; capabilities?: string[]; max_daily_runs?: number; max_daily_cost_usd?: number; metadata?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; slug?: string; name?: string; role?: string; description?: string | null; icon?: string; accent?: string; color?: string; autonomy?: string; status?: string; capabilities?: string[]; max_daily_runs?: number; max_daily_cost_usd?: number; metadata?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      approval_chains: {
        Row: { id: string; user_id: string; approval_id: string; step_index: number; required_role: string; status: string; decided_by: string | null; decided_at: string | null; note: string | null; created_at: string };
        Insert: { id?: string; user_id: string; approval_id: string; step_index: number; required_role: string; status?: string; decided_by?: string | null; decided_at?: string | null; note?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; approval_id?: string; step_index?: number; required_role?: string; status?: string; decided_by?: string | null; decided_at?: string | null; note?: string | null; created_at?: string };
        Relationships: [];
      };
      agent_metrics: {
        Row: { id: number; user_id: string; agent_slug: string; bucket: string; runs_started: number; runs_completed: number; runs_failed: number; tokens_in: number; tokens_out: number; cost_usd: number; p50_duration_ms: number | null; p95_duration_ms: number | null };
        Insert: { id?: number; user_id: string; agent_slug: string; bucket: string; runs_started?: number; runs_completed?: number; runs_failed?: number; tokens_in?: number; tokens_out?: number; cost_usd?: number; p50_duration_ms?: number | null; p95_duration_ms?: number | null };
        Update: { id?: number; user_id?: string; agent_slug?: string; bucket?: string; runs_started?: number; runs_completed?: number; runs_failed?: number; tokens_in?: number; tokens_out?: number; cost_usd?: number; p50_duration_ms?: number | null; p95_duration_ms?: number | null };
        Relationships: [];
      };
      governance_events: {
        Row: { id: number; user_id: string; actor_type: string; actor_id: string; event_type: string; severity: string; resource_type: string | null; resource_id: string | null; summary: string; payload: Json; created_at: string };
        Insert: { id?: number; user_id: string; actor_type: string; actor_id: string; event_type: string; severity?: string; resource_type?: string | null; resource_id?: string | null; summary: string; payload?: Json; created_at?: string };
        Update: { id?: number; user_id?: string; actor_type?: string; actor_id?: string; event_type?: string; severity?: string; resource_type?: string | null; resource_id?: string | null; summary?: string; payload?: Json; created_at?: string };
        Relationships: [];
      };
      content_posts: {
        Row: { id: string; user_id: string; title: string; body: string; platforms: string[]; scheduled_for: string | null; status: string; media_urls: string[]; metadata: Json; approved_by: string | null; approved_at: string | null; rejection_reason: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title?: string; body?: string; platforms?: string[]; scheduled_for?: string | null; status?: string; media_urls?: string[]; metadata?: Json; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; title?: string; body?: string; platforms?: string[]; scheduled_for?: string | null; status?: string; media_urls?: string[]; metadata?: Json; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      knowledge_bases: {
        Row: { id: string; user_id: string; name: string; description: string | null; scope: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; description?: string | null; scope?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; description?: string | null; scope?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      notifications: {
        Row: { id: string; user_id: string; title: string; body: string | null; kind: string; link: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; title: string; body?: string | null; kind?: string; link?: string | null; read_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; title?: string; body?: string | null; kind?: string; link?: string | null; read_at?: string | null; created_at?: string };
        Relationships: [];
      };
      documents: {
        Row: { id: string; knowledge_base_id: string; user_id: string; name: string; mime_type: string | null; size_bytes: number; source_url: string | null; status: string; error_message: string | null; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; knowledge_base_id: string; user_id: string; name: string; mime_type?: string | null; size_bytes?: number; source_url?: string | null; status?: string; error_message?: string | null; metadata?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; knowledge_base_id?: string; user_id?: string; name?: string; mime_type?: string | null; size_bytes?: number; source_url?: string | null; status?: string; error_message?: string | null; metadata?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      document_sections: {
        Row: { id: number; document_id: string; user_id: string; content: string; embedding: number[] | null; chunk_index: number; token_count: number; created_at: string };
        Insert: { id?: number; document_id: string; user_id: string; content: string; embedding?: number[] | null; chunk_index?: number; token_count?: number; created_at?: string };
        Update: { id?: number; document_id?: string; user_id?: string; content?: string; embedding?: number[] | null; chunk_index?: number; token_count?: number; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_job: { Args: { p_worker_id: string }; Returns: Database["public"]["Tables"]["job_queue"]["Row"][] };
      check_rate_limit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      store_platform_secret: { Args: { p_connection_id: string; p_kind: string; p_value: string; p_name: string }; Returns: string };
      read_platform_secret: { Args: { p_connection_id: string; p_kind: string }; Returns: string | null };
      delete_platform_secret: { Args: { p_connection_id: string; p_kind: string }; Returns: undefined };
      admin_read_platform_secret: { Args: { p_connection_id: string; p_kind: string; p_user_id: string }; Returns: string | null };
      admin_store_platform_secret: { Args: { p_connection_id: string; p_kind: string; p_value: string; p_name: string; p_user_id: string }; Returns: string };
      seed_default_agents: { Args: { p_user_id: string }; Returns: undefined };
      match_document_sections: {
        Args: { query_embedding: number[]; match_threshold?: number; match_count?: number; p_kb_ids?: string[] | null };
        Returns: Array<{ id: number; document_id: string; content: string; similarity: number }>;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ─── Row aliases ──────────────────────────────────────────────────────────
export type Profile            = Database["public"]["Tables"]["profiles"]["Row"];
export type Lead               = Database["public"]["Tables"]["leads"]["Row"];
export type Campaign           = Database["public"]["Tables"]["campaigns"]["Row"];
export type Email              = Database["public"]["Tables"]["emails"]["Row"];
export type Call               = Database["public"]["Tables"]["calls"]["Row"];
export type AdPerformance      = Database["public"]["Tables"]["ad_performance"]["Row"];
export type AgentRun           = Database["public"]["Tables"]["agent_runs"]["Row"];
export type Job                = Database["public"]["Tables"]["job_queue"]["Row"];
export type RateLimit          = Database["public"]["Tables"]["rate_limits"]["Row"];
export type Approval           = Database["public"]["Tables"]["approvals"]["Row"];
export type Signal             = Database["public"]["Tables"]["signals"]["Row"];
export type AgentCost          = Database["public"]["Tables"]["agent_costs"]["Row"];
export type PlatformConnection = Database["public"]["Tables"]["platform_connections"]["Row"];
export type AuthEvent          = Database["public"]["Tables"]["auth_events"]["Row"];
export type AgentRegistry      = Database["public"]["Tables"]["agent_registry"]["Row"];
export type ApprovalChain      = Database["public"]["Tables"]["approval_chains"]["Row"];
export type AgentMetric        = Database["public"]["Tables"]["agent_metrics"]["Row"];
export type GovernanceEvent    = Database["public"]["Tables"]["governance_events"]["Row"];
export type ContentPost        = Database["public"]["Tables"]["content_posts"]["Row"];
export type KnowledgeBase      = Database["public"]["Tables"]["knowledge_bases"]["Row"];
export type DocumentRow        = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentSection    = Database["public"]["Tables"]["document_sections"]["Row"];
export type NotificationRow    = Database["public"]["Tables"]["notifications"]["Row"];

// ─── Insert aliases ───────────────────────────────────────────────────────
export type ProfileInsert            = Database["public"]["Tables"]["profiles"]["Insert"];
export type LeadInsert               = Database["public"]["Tables"]["leads"]["Insert"];
export type CampaignInsert           = Database["public"]["Tables"]["campaigns"]["Insert"];
export type EmailInsert              = Database["public"]["Tables"]["emails"]["Insert"];
export type CallInsert               = Database["public"]["Tables"]["calls"]["Insert"];
export type AdPerformanceInsert      = Database["public"]["Tables"]["ad_performance"]["Insert"];
export type AgentRunInsert           = Database["public"]["Tables"]["agent_runs"]["Insert"];
export type JobInsert                = Database["public"]["Tables"]["job_queue"]["Insert"];
export type RateLimitInsert          = Database["public"]["Tables"]["rate_limits"]["Insert"];
export type ApprovalInsert           = Database["public"]["Tables"]["approvals"]["Insert"];
export type SignalInsert             = Database["public"]["Tables"]["signals"]["Insert"];
export type AgentCostInsert          = Database["public"]["Tables"]["agent_costs"]["Insert"];
export type PlatformConnectionInsert = Database["public"]["Tables"]["platform_connections"]["Insert"];
export type AuthEventInsert          = Database["public"]["Tables"]["auth_events"]["Insert"];
export type AgentRegistryInsert      = Database["public"]["Tables"]["agent_registry"]["Insert"];
export type ApprovalChainInsert      = Database["public"]["Tables"]["approval_chains"]["Insert"];
export type AgentMetricInsert        = Database["public"]["Tables"]["agent_metrics"]["Insert"];
export type GovernanceEventInsert    = Database["public"]["Tables"]["governance_events"]["Insert"];
export type ContentPostInsert        = Database["public"]["Tables"]["content_posts"]["Insert"];
export type KnowledgeBaseInsert      = Database["public"]["Tables"]["knowledge_bases"]["Insert"];
export type DocumentInsert           = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentSectionInsert    = Database["public"]["Tables"]["document_sections"]["Insert"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// ─── Update aliases ───────────────────────────────────────────────────────
export type ProfileUpdate            = Database["public"]["Tables"]["profiles"]["Update"];
export type LeadUpdate               = Database["public"]["Tables"]["leads"]["Update"];
export type CampaignUpdate           = Database["public"]["Tables"]["campaigns"]["Update"];
export type EmailUpdate              = Database["public"]["Tables"]["emails"]["Update"];
export type CallUpdate               = Database["public"]["Tables"]["calls"]["Update"];
export type AgentRunUpdate           = Database["public"]["Tables"]["agent_runs"]["Update"];
export type JobUpdate                = Database["public"]["Tables"]["job_queue"]["Update"];
export type ApprovalUpdate           = Database["public"]["Tables"]["approvals"]["Update"];
export type SignalUpdate             = Database["public"]["Tables"]["signals"]["Update"];
export type ContentPostUpdate        = Database["public"]["Tables"]["content_posts"]["Update"];
export type KnowledgeBaseUpdate      = Database["public"]["Tables"]["knowledge_bases"]["Update"];
export type DocumentUpdate           = Database["public"]["Tables"]["documents"]["Update"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

// ─── Literal unions ───────────────────────────────────────────────────────
export type LeadStatus        = "new" | "contacted" | "qualified" | "converted" | "lost";
export type CampaignStatus    = "draft" | "active" | "paused" | "completed";
export type CampaignType      = "email" | "call" | "multi_channel" | "paid_ads";
export type ContentStatus     = "draft" | "pending_approval" | "scheduled" | "published" | "rejected" | "failed";
export type DocumentStatus    = "pending" | "processing" | "ready" | "failed";
export type KnowledgeScope    = "private" | "shared_with_agents" | "shared_with_team";
export type PlatformSlug      = "instagram" | "facebook" | "youtube" | "linkedin" | "tiktok";

export type NotificationKind =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "approval"
  | "signal"
  | "call"
  | "content";

// ─── RPC helpers ──────────────────────────────────────────────────────────
export type ClaimJobArgs   = Database["public"]["Functions"]["claim_job"]["Args"];
export type ClaimJobReturn = Database["public"]["Functions"]["claim_job"]["Returns"];
export type MatchDocumentSectionsArgs   = Database["public"]["Functions"]["match_document_sections"]["Args"];
export type MatchDocumentSectionsReturn = Database["public"]["Functions"]["match_document_sections"]["Returns"];

// ═══════════════════════════════════════════════════════════════════════════
// Literal unions for CHECK-constrained columns
// ═══════════════════════════════════════════════════════════════════════════

export type EmailStatus =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced";

export type CallDirection = "inbound" | "outbound";
export type CallSentiment = "positive" | "neutral" | "negative";

export type AgentRunStatus =
  | "running"
  | "completed"
  | "failed"
  | "pending_approval";

export type JobStatus = "pending" | "processing" | "done" | "failed";
export type Plan = "free" | "starter" | "growth" | "scale" | "enterprise";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type SignalUrgency = "low" | "medium" | "high" | "critical";

// ═══════════════════════════════════════════════════════════════════════════
// RPC helper types
// ═══════════════════════════════════════════════════════════════════════════

export type CheckRateLimitArgs =
  Database["public"]["Functions"]["check_rate_limit"]["Args"];
export type CheckRateLimitReturn =
  Database["public"]["Functions"]["check_rate_limit"]["Returns"];

export type StorePlatformSecretArgs =
  Database["public"]["Functions"]["store_platform_secret"]["Args"];
export type StorePlatformSecretReturn =
  Database["public"]["Functions"]["store_platform_secret"]["Returns"];
export type ReadPlatformSecretArgs =
  Database["public"]["Functions"]["read_platform_secret"]["Args"];
export type ReadPlatformSecretReturn =
  Database["public"]["Functions"]["read_platform_secret"]["Returns"];

export type SeedDefaultAgentsArgs =
  Database["public"]["Functions"]["seed_default_agents"]["Args"];

// ═══════════════════════════════════════════════════════════════════════════
// Row aliases for content_posts and knowledge (used by Server Actions)
// ═══════════════════════════════════════════════════════════════════════════

export type ContentPostRow = ContentPost;
export type KnowledgeBaseRowAlias = KnowledgeBase;
