// ═══════════════════════════════════════════════════════════════════════════
// Setu Kalki — Canonical database types
// 45 tables: 22 original + 23 Phase 2
// Regenerate with: supabase gen types typescript --local
// ═══════════════════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      // ─── CORE TABLES ───────────────────────────────────────────────────
      profiles: {
        Row: { id: string; email: string; full_name: string | null; plan: string; settings: Json; created_at: string; updated_at: string };
        Insert: { id: string; email: string; full_name?: string | null; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; email?: string; full_name?: string | null; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      leads: {
        Row: { id: string; user_id: string; name: string | null; email: string | null; phone: string | null; company: string | null; title: string | null; score: number; status: string; source: string; enriched_data: Json; icp_embedding: number[] | null; icp_grade: string | null; bant_budget: number; bant_authority: number; bant_need: number; bant_timeline: number; enrichment_source: string | null; last_touch_at: string | null; owner_agent: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; title?: string | null; score?: number; status?: string; source: string; enriched_data?: Json; icp_embedding?: number[] | null; icp_grade?: string | null; bant_budget?: number; bant_authority?: number; bant_need?: number; bant_timeline?: number; enrichment_source?: string | null; last_touch_at?: string | null; owner_agent?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string | null; email?: string | null; phone?: string | null; company?: string | null; title?: string | null; score?: number; status?: string; source?: string; enriched_data?: Json; icp_embedding?: number[] | null; icp_grade?: string | null; bant_budget?: number; bant_authority?: number; bant_need?: number; bant_timeline?: number; enrichment_source?: string | null; last_touch_at?: string | null; owner_agent?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      campaigns: {
        Row: { id: string; user_id: string; name: string; status: string; type: string; workflow: Json; metrics: Json; markifact_campaign_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; status?: string; type: string; workflow?: Json; metrics?: Json; markifact_campaign_id?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; status?: string; type?: string; workflow?: Json; metrics?: Json; markifact_campaign_id?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      emails: {
        Row: { id: string; lead_id: string; campaign_id: string | null; subject: string | null; body: string | null; status: string; resend_id: string | null; sent_at: string | null; opened_at: string | null; sequence_id: string | null; step_index: number; variant: string; reply_intent: string | null; reply_text: string | null; replied_at: string | null; open_count: number; click_count: number; created_at: string };
        Insert: { id?: string; lead_id: string; campaign_id?: string | null; subject?: string | null; body?: string | null; status?: string; resend_id?: string | null; sent_at?: string | null; opened_at?: string | null; sequence_id?: string | null; step_index?: number; variant?: string; reply_intent?: string | null; reply_text?: string | null; replied_at?: string | null; open_count?: number; click_count?: number; created_at?: string };
        Update: { id?: string; lead_id?: string; campaign_id?: string | null; subject?: string | null; body?: string | null; status?: string; resend_id?: string | null; sent_at?: string | null; opened_at?: string | null; sequence_id?: string | null; step_index?: number; variant?: string; reply_intent?: string | null; reply_text?: string | null; replied_at?: string | null; open_count?: number; click_count?: number; created_at?: string };
        Relationships: [];
      };
      calls: {
        Row: { id: string; lead_id: string; agentcall_id: string | null; direction: string; transcript: string | null; summary: string | null; sentiment: string | null; action_items: Json; duration_seconds: number | null; call_queue_id: string | null; recording_url: string | null; disposition: string | null; intent_score: number | null; key_topics: string[] | null; next_action: string | null; next_action_at: string | null; created_at: string };
        Insert: { id?: string; lead_id: string; agentcall_id?: string | null; direction: string; transcript?: string | null; summary?: string | null; sentiment?: string | null; action_items?: Json; duration_seconds?: number | null; call_queue_id?: string | null; recording_url?: string | null; disposition?: string | null; intent_score?: number | null; key_topics?: string[] | null; next_action?: string | null; next_action_at?: string | null; created_at?: string };
        Update: { id?: string; lead_id?: string; agentcall_id?: string | null; direction?: string; transcript?: string | null; summary?: string | null; sentiment?: string | null; action_items?: Json; duration_seconds?: number | null; call_queue_id?: string | null; recording_url?: string | null; disposition?: string | null; intent_score?: number | null; key_topics?: string[] | null; next_action?: string | null; next_action_at?: string | null; created_at?: string };
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
        Row: { id: string; user_id: string; agent_name: string; action: string; payload: Json; reasoning: string | null; confidence: number | null; status: string; decided_at: string | null; decided_by: string | null; decision_reason: string | null; expires_at: string | null; risk_level: string | null; justification: string | null; batch_id: string | null; execution_status: string; execution_result: Json | null; created_at: string };
        Insert: { id?: string; user_id: string; agent_name: string; action: string; payload?: Json; reasoning?: string | null; confidence?: number | null; status?: string; decided_at?: string | null; decided_by?: string | null; decision_reason?: string | null; expires_at?: string | null; risk_level?: string | null; justification?: string | null; batch_id?: string | null; execution_status?: string; execution_result?: Json | null; created_at?: string };
        Update: { id?: string; user_id?: string; agent_name?: string; action?: string; payload?: Json; reasoning?: string | null; confidence?: number | null; status?: string; decided_at?: string | null; decided_by?: string | null; decision_reason?: string | null; expires_at?: string | null; risk_level?: string | null; justification?: string | null; batch_id?: string | null; execution_status?: string; execution_result?: Json | null; created_at?: string };
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
        Row: { id: string; user_id: string; title: string; body: string; platforms: string[]; scheduled_for: string | null; status: string; media_urls: string[]; metadata: Json; approved_by: string | null; approved_at: string | null; rejection_reason: string | null; post_type: string; platform_post_ids: Json; publish_errors: Json; collaborators: string[]; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title?: string; body?: string; platforms?: string[]; scheduled_for?: string | null; status?: string; media_urls?: string[]; metadata?: Json; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; post_type?: string; platform_post_ids?: Json; publish_errors?: Json; collaborators?: string[]; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; title?: string; body?: string; platforms?: string[]; scheduled_for?: string | null; status?: string; media_urls?: string[]; metadata?: Json; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null; post_type?: string; platform_post_ids?: Json; publish_errors?: Json; collaborators?: string[]; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      knowledge_bases: {
        Row: { id: string; user_id: string; name: string; description: string | null; scope: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; description?: string | null; scope?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; name?: string; description?: string | null; scope?: string; created_at?: string; updated_at?: string };
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
      notifications: {
        Row: { id: string; user_id: string; title: string; body: string | null; kind: string; link: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; title: string; body?: string | null; kind?: string; link?: string | null; read_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; title?: string; body?: string | null; kind?: string; link?: string | null; read_at?: string | null; created_at?: string };
        Relationships: [];
      };

      // ─── PHASE 2 TABLES ────────────────────────────────────────────────
      media_assets: {
        Row: { id: string; user_id: string; org_id: string | null; name: string; type: string; mime_type: string; size_bytes: number; width: number | null; height: number | null; duration_seconds: number | null; storage_path: string; thumbnail_path: string | null; alt_text: string | null; tags: string[]; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; org_id?: string | null; name: string; type: string; mime_type: string; size_bytes?: number; width?: number | null; height?: number | null; duration_seconds?: number | null; storage_path: string; thumbnail_path?: string | null; alt_text?: string | null; tags?: string[]; metadata?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; org_id?: string | null; name?: string; type?: string; mime_type?: string; size_bytes?: number; width?: number | null; height?: number | null; duration_seconds?: number | null; storage_path?: string; thumbnail_path?: string | null; alt_text?: string | null; tags?: string[]; metadata?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      post_media: {
        Row: { post_id: string; media_id: string; position: number; caption: string | null; alt_text: string | null };
        Insert: { post_id: string; media_id: string; position?: number; caption?: string | null; alt_text?: string | null };
        Update: { post_id?: string; media_id?: string; position?: number; caption?: string | null; alt_text?: string | null };
        Relationships: [];
      };
      conversations: {
        Row: { id: string; user_id: string; org_id: string | null; lead_id: string | null; channel: string; subject: string | null; status: string; priority: string; assigned_to: string | null; sentiment: string | null; last_message_at: string | null; last_message_preview: string | null; unread_count: number; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; org_id?: string | null; lead_id?: string | null; channel: string; subject?: string | null; status?: string; priority?: string; assigned_to?: string | null; sentiment?: string | null; last_message_at?: string | null; last_message_preview?: string | null; unread_count?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; org_id?: string | null; lead_id?: string | null; channel?: string; subject?: string | null; status?: string; priority?: string; assigned_to?: string | null; sentiment?: string | null; last_message_at?: string | null; last_message_preview?: string | null; unread_count?: number; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      conversation_messages: {
        Row: { id: string; conversation_id: string; direction: string; sender_type: string; sender_name: string | null; content: string; attachments: Json; channel_message_id: string | null; is_internal_note: boolean; created_at: string };
        Insert: { id?: string; conversation_id: string; direction: string; sender_type: string; sender_name?: string | null; content: string; attachments?: Json; channel_message_id?: string | null; is_internal_note?: boolean; created_at?: string };
        Update: { id?: string; conversation_id?: string; direction?: string; sender_type?: string; sender_name?: string | null; content?: string; attachments?: Json; channel_message_id?: string | null; is_internal_note?: boolean; created_at?: string };
        Relationships: [];
      };
      email_domains: {
        Row: { id: string; user_id: string; domain: string; spf_verified: boolean; dkim_verified: boolean; dmarc_verified: boolean; dmarc_policy: string | null; sender_score: number; warmup_stage: number; daily_send_limit: number; bounce_rate: number; complaint_rate: number; last_checked_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; domain: string; spf_verified?: boolean; dkim_verified?: boolean; dmarc_verified?: boolean; dmarc_policy?: string | null; sender_score?: number; warmup_stage?: number; daily_send_limit?: number; bounce_rate?: number; complaint_rate?: number; last_checked_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; domain?: string; spf_verified?: boolean; dkim_verified?: boolean; dmarc_verified?: boolean; dmarc_policy?: string | null; sender_score?: number; warmup_stage?: number; daily_send_limit?: number; bounce_rate?: number; complaint_rate?: number; last_checked_at?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      email_bounces: {
        Row: { id: number; user_id: string; lead_id: string | null; email: string; bounce_type: string; reason: string | null; bounced_at: string };
        Insert: { id?: number; user_id: string; lead_id?: string | null; email: string; bounce_type: string; reason?: string | null; bounced_at?: string };
        Update: { id?: number; user_id?: string; lead_id?: string | null; email?: string; bounce_type?: string; reason?: string | null; bounced_at?: string };
        Relationships: [];
      };
      touchpoints: {
        Row: { id: number; user_id: string; lead_id: string; channel: string; campaign_id: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null; touched_at: string };
        Insert: { id?: number; user_id: string; lead_id: string; channel: string; campaign_id?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null; utm_term?: string | null; touched_at?: string };
        Update: { id?: number; user_id?: string; lead_id?: string; channel?: string; campaign_id?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null; utm_term?: string | null; touched_at?: string };
        Relationships: [];
      };
      attributions: {
        Row: { id: number; user_id: string; lead_id: string; conversion_event: string; conversion_value: number | null; channel_credits: Json; model: string; attributed_at: string };
        Insert: { id?: number; user_id: string; lead_id: string; conversion_event: string; conversion_value?: number | null; channel_credits?: Json; model?: string; attributed_at?: string };
        Update: { id?: number; user_id?: string; lead_id?: string; conversion_event?: string; conversion_value?: number | null; channel_credits?: Json; model?: string; attributed_at?: string };
        Relationships: [];
      };
      ab_tests: {
        Row: { id: string; user_id: string; name: string; test_type: string; variants: Json; traffic_split: Json; status: string; winner_variant: string | null; confidence: number | null; started_at: string | null; completed_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; name: string; test_type: string; variants?: Json; traffic_split?: Json; status?: string; winner_variant?: string | null; confidence?: number | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; name?: string; test_type?: string; variants?: Json; traffic_split?: Json; status?: string; winner_variant?: string | null; confidence?: number | null; started_at?: string | null; completed_at?: string | null; created_at?: string };
        Relationships: [];
      };
      ab_test_results: {
        Row: { id: number; test_id: string; variant_id: string; sends: number; opens: number; replies: number; conversions: number; updated_at: string };
        Insert: { id?: number; test_id: string; variant_id: string; sends?: number; opens?: number; replies?: number; conversions?: number; updated_at?: string };
        Update: { id?: number; test_id?: string; variant_id?: string; sends?: number; opens?: number; replies?: number; conversions?: number; updated_at?: string };
        Relationships: [];
      };
      organizations: {
        Row: { id: string; name: string; slug: string; plan: string; settings: Json; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; slug?: string; plan?: string; settings?: Json; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      organization_members: {
        Row: { org_id: string; user_id: string; role: string; invited_at: string; joined_at: string | null };
        Insert: { org_id: string; user_id: string; role?: string; invited_at?: string; joined_at?: string | null };
        Update: { org_id?: string; user_id?: string; role?: string; invited_at?: string; joined_at?: string | null };
        Relationships: [];
      };
      agent_telemetry: {
        Row: { id: number; user_id: string; run_id: string | null; trace_id: string; span_id: string; parent_span_id: string | null; agent_slug: string; step_index: number | null; event_type: string; gen_ai_system: string | null; gen_ai_operation: string | null; gen_ai_request_model: string | null; gen_ai_response_model: string | null; gen_ai_input_tokens: number | null; gen_ai_output_tokens: number | null; duration_ms: number | null; span_status: string | null; exception_message: string | null; attributes: Json; created_at: string };
        Insert: { id?: number; user_id: string; run_id?: string | null; trace_id: string; span_id: string; parent_span_id?: string | null; agent_slug: string; step_index?: number | null; event_type: string; gen_ai_system?: string | null; gen_ai_operation?: string | null; gen_ai_request_model?: string | null; gen_ai_response_model?: string | null; gen_ai_input_tokens?: number | null; gen_ai_output_tokens?: number | null; duration_ms?: number | null; span_status?: string | null; exception_message?: string | null; attributes?: Json; created_at?: string };
        Update: { id?: number; user_id?: string; run_id?: string | null; trace_id?: string; span_id?: string; parent_span_id?: string | null; agent_slug?: string; step_index?: number | null; event_type?: string; gen_ai_system?: string | null; gen_ai_operation?: string | null; gen_ai_request_model?: string | null; gen_ai_response_model?: string | null; gen_ai_input_tokens?: number | null; gen_ai_output_tokens?: number | null; duration_ms?: number | null; span_status?: string | null; exception_message?: string | null; attributes?: Json; created_at?: string };
        Relationships: [];
      };
      evaluation_results: {
        Row: { id: number; user_id: string; run_id: string; scope: string; score: number | null; safety_flags: string[]; judge_model: string | null; reasoning: string | null; created_at: string };
        Insert: { id?: number; user_id: string; run_id: string; scope: string; score?: number | null; safety_flags?: string[]; judge_model?: string | null; reasoning?: string | null; created_at?: string };
        Update: { id?: number; user_id?: string; run_id?: string; scope?: string; score?: number | null; safety_flags?: string[]; judge_model?: string | null; reasoning?: string | null; created_at?: string };
        Relationships: [];
      };
      policy_violations: {
        Row: { id: number; user_id: string; run_id: string | null; policy_name: string; severity: string; details: Json; created_at: string };
        Insert: { id?: number; user_id: string; run_id?: string | null; policy_name: string; severity?: string; details?: Json; created_at?: string };
        Update: { id?: number; user_id?: string; run_id?: string | null; policy_name?: string; severity?: string; details?: Json; created_at?: string };
        Relationships: [];
      };
      whatsapp_accounts: {
        Row: { id: string; user_id: string; waba_id: string; phone_number_id: string; display_phone_number: string | null; business_name: string | null; messaging_tier: string | null; quality_rating: string | null; status: string | null; created_at: string };
        Insert: { id?: string; user_id: string; waba_id: string; phone_number_id: string; display_phone_number?: string | null; business_name?: string | null; messaging_tier?: string | null; quality_rating?: string | null; status?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; waba_id?: string; phone_number_id?: string; display_phone_number?: string | null; business_name?: string | null; messaging_tier?: string | null; quality_rating?: string | null; status?: string | null; created_at?: string };
        Relationships: [];
      };
      whatsapp_templates: {
        Row: { id: string; user_id: string; waba_id: string; template_name: string; language: string; category: string; status: string; components: Json; rejection_reason: string | null; created_at: string };
        Insert: { id?: string; user_id: string; waba_id: string; template_name: string; language?: string; category: string; status?: string; components?: Json; rejection_reason?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; waba_id?: string; template_name?: string; language?: string; category?: string; status?: string; components?: Json; rejection_reason?: string | null; created_at?: string };
        Relationships: [];
      };
      whatsapp_consents: {
        Row: { id: string; user_id: string; contact_phone: string; lead_id: string | null; consent_type: string; consent_source: string; consent_text: string; ip_address: string | null; created_at: string };
        Insert: { id?: string; user_id: string; contact_phone: string; lead_id?: string | null; consent_type: string; consent_source: string; consent_text: string; ip_address?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; contact_phone?: string; lead_id?: string | null; consent_type?: string; consent_source?: string; consent_text?: string; ip_address?: string | null; created_at?: string };
        Relationships: [];
      };
      whatsapp_messages: {
        Row: { id: string; user_id: string; lead_id: string | null; waba_id: string; template_name: string | null; message_type: string; direction: string; status: string; message_id: string | null; cost_inr: number; conversation_window_until: string | null; sent_at: string | null; delivered_at: string | null; read_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; lead_id?: string | null; waba_id: string; template_name?: string | null; message_type: string; direction: string; status?: string; message_id?: string | null; cost_inr?: number; conversation_window_until?: string | null; sent_at?: string | null; delivered_at?: string | null; read_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; lead_id?: string | null; waba_id?: string; template_name?: string | null; message_type?: string; direction?: string; status?: string; message_id?: string | null; cost_inr?: number; conversation_window_until?: string | null; sent_at?: string | null; delivered_at?: string | null; read_at?: string | null; created_at?: string };
        Relationships: [];
      };
      action_policies: {
        Row: { id: string; user_id: string; agent_slug: string; action_name: string; tier: string; max_daily_volume: number; requires_justification: boolean; auto_approve_below_confidence: number | null; created_at: string };
        Insert: { id?: string; user_id: string; agent_slug: string; action_name: string; tier?: string; max_daily_volume?: number; requires_justification?: boolean; auto_approve_below_confidence?: number | null; created_at?: string };
        Update: { id?: string; user_id?: string; agent_slug?: string; action_name?: string; tier?: string; max_daily_volume?: number; requires_justification?: boolean; auto_approve_below_confidence?: number | null; created_at?: string };
        Relationships: [];
      };
      agent_schedules: {
        Row: { id: string; user_id: string; agent_slug: string; name: string; cron_expression: string; task_template: Json; enabled: boolean; last_run_at: string | null; next_run_at: string | null; last_run_status: string | null; consecutive_failures: number; created_at: string };
        Insert: { id?: string; user_id: string; agent_slug: string; name: string; cron_expression: string; task_template?: Json; enabled?: boolean; last_run_at?: string | null; next_run_at?: string | null; last_run_status?: string | null; consecutive_failures?: number; created_at?: string };
        Update: { id?: string; user_id?: string; agent_slug?: string; name?: string; cron_expression?: string; task_template?: Json; enabled?: boolean; last_run_at?: string | null; next_run_at?: string | null; last_run_status?: string | null; consecutive_failures?: number; created_at?: string };
        Relationships: [];
      };
      agent_run_steps: {
        Row: { id: number; run_id: string; step_index: number; description: string | null; tool: string | null; status: string; input: Json | null; output: Json | null; confidence: number | null; error: string | null; duration_ms: number | null; created_at: string };
        Insert: { id?: number; run_id: string; step_index: number; description?: string | null; tool?: string | null; status?: string; input?: Json | null; output?: Json | null; confidence?: number | null; error?: string | null; duration_ms?: number | null; created_at?: string };
        Update: { id?: number; run_id?: string; step_index?: number; description?: string | null; tool?: string | null; status?: string; input?: Json | null; output?: Json | null; confidence?: number | null; error?: string | null; duration_ms?: number | null; created_at?: string };
        Relationships: [];
      };
      approval_batches: {
        Row: { id: string; user_id: string; digest_title: string; item_count: number; status: string; decided_at: string | null; decided_by: string | null; created_at: string };
        Insert: { id?: string; user_id: string; digest_title: string; item_count: number; status?: string; decided_at?: string | null; decided_by?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; digest_title?: string; item_count?: number; status?: string; decided_at?: string | null; decided_by?: string | null; created_at?: string };
        Relationships: [];
      };
      approval_batch_items: {
        Row: { batch_id: string; approval_id: string };
        Insert: { batch_id: string; approval_id: string };
        Update: { batch_id?: string; approval_id?: string };
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
      refresh_user_org_claims: { Args: { p_user_id: string }; Returns: undefined };
      auth_org_ids: { Args: Record<string, never>; Returns: string[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

// ═══════════════════════════════════════════════════════════════════════════
// ROW ALIASES
// ═══════════════════════════════════════════════════════════════════════════

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type Email = Database["public"]["Tables"]["emails"]["Row"];
export type Call = Database["public"]["Tables"]["calls"]["Row"];
export type AdPerformance = Database["public"]["Tables"]["ad_performance"]["Row"];
export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];
export type Job = Database["public"]["Tables"]["job_queue"]["Row"];
export type RateLimit = Database["public"]["Tables"]["rate_limits"]["Row"];
export type Approval = Database["public"]["Tables"]["approvals"]["Row"];
export type Signal = Database["public"]["Tables"]["signals"]["Row"];
export type AgentCost = Database["public"]["Tables"]["agent_costs"]["Row"];
export type PlatformConnection = Database["public"]["Tables"]["platform_connections"]["Row"];
export type AuthEvent = Database["public"]["Tables"]["auth_events"]["Row"];
export type AgentRegistry = Database["public"]["Tables"]["agent_registry"]["Row"];
export type ApprovalChain = Database["public"]["Tables"]["approval_chains"]["Row"];
export type AgentMetric = Database["public"]["Tables"]["agent_metrics"]["Row"];
export type GovernanceEvent = Database["public"]["Tables"]["governance_events"]["Row"];
export type ContentPost = Database["public"]["Tables"]["content_posts"]["Row"];
export type KnowledgeBase = Database["public"]["Tables"]["knowledge_bases"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentSection = Database["public"]["Tables"]["document_sections"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
export type PostMedia = Database["public"]["Tables"]["post_media"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationMessage = Database["public"]["Tables"]["conversation_messages"]["Row"];
export type EmailDomain = Database["public"]["Tables"]["email_domains"]["Row"];
export type EmailBounce = Database["public"]["Tables"]["email_bounces"]["Row"];
export type Touchpoint = Database["public"]["Tables"]["touchpoints"]["Row"];
export type Attribution = Database["public"]["Tables"]["attributions"]["Row"];
export type ABTest = Database["public"]["Tables"]["ab_tests"]["Row"];
export type ABTestResult = Database["public"]["Tables"]["ab_test_results"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type AgentTelemetry = Database["public"]["Tables"]["agent_telemetry"]["Row"];
export type EvaluationResult = Database["public"]["Tables"]["evaluation_results"]["Row"];
export type PolicyViolation = Database["public"]["Tables"]["policy_violations"]["Row"];
export type WhatsAppAccount = Database["public"]["Tables"]["whatsapp_accounts"]["Row"];
export type WhatsAppTemplate = Database["public"]["Tables"]["whatsapp_templates"]["Row"];
export type WhatsAppConsent = Database["public"]["Tables"]["whatsapp_consents"]["Row"];
export type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type ActionPolicy = Database["public"]["Tables"]["action_policies"]["Row"];
export type AgentSchedule = Database["public"]["Tables"]["agent_schedules"]["Row"];
export type AgentRunStep = Database["public"]["Tables"]["agent_run_steps"]["Row"];
export type ApprovalBatch = Database["public"]["Tables"]["approval_batches"]["Row"];
export type ApprovalBatchItem = Database["public"]["Tables"]["approval_batch_items"]["Row"];

// ─── Insert aliases ────────────────────────────────────────────────────────
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type CampaignInsert = Database["public"]["Tables"]["campaigns"]["Insert"];
export type EmailInsert = Database["public"]["Tables"]["emails"]["Insert"];
export type CallInsert = Database["public"]["Tables"]["calls"]["Insert"];
export type AdPerformanceInsert = Database["public"]["Tables"]["ad_performance"]["Insert"];
export type AgentRunInsert = Database["public"]["Tables"]["agent_runs"]["Insert"];
export type JobInsert = Database["public"]["Tables"]["job_queue"]["Insert"];
export type RateLimitInsert = Database["public"]["Tables"]["rate_limits"]["Insert"];
export type ApprovalInsert = Database["public"]["Tables"]["approvals"]["Insert"];
export type SignalInsert = Database["public"]["Tables"]["signals"]["Insert"];
export type AgentCostInsert = Database["public"]["Tables"]["agent_costs"]["Insert"];
export type PlatformConnectionInsert = Database["public"]["Tables"]["platform_connections"]["Insert"];
export type AuthEventInsert = Database["public"]["Tables"]["auth_events"]["Insert"];
export type AgentRegistryInsert = Database["public"]["Tables"]["agent_registry"]["Insert"];
export type ApprovalChainInsert = Database["public"]["Tables"]["approval_chains"]["Insert"];
export type AgentMetricInsert = Database["public"]["Tables"]["agent_metrics"]["Insert"];
export type GovernanceEventInsert = Database["public"]["Tables"]["governance_events"]["Insert"];
export type ContentPostInsert = Database["public"]["Tables"]["content_posts"]["Insert"];
export type KnowledgeBaseInsert = Database["public"]["Tables"]["knowledge_bases"]["Insert"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentSectionInsert = Database["public"]["Tables"]["document_sections"]["Insert"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type MediaAssetInsert = Database["public"]["Tables"]["media_assets"]["Insert"];
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];
export type ConversationMessageInsert = Database["public"]["Tables"]["conversation_messages"]["Insert"];
export type EmailDomainInsert = Database["public"]["Tables"]["email_domains"]["Insert"];
export type EmailBounceInsert = Database["public"]["Tables"]["email_bounces"]["Insert"];
export type TouchpointInsert = Database["public"]["Tables"]["touchpoints"]["Insert"];
export type AttributionInsert = Database["public"]["Tables"]["attributions"]["Insert"];
export type ABTestInsert = Database["public"]["Tables"]["ab_tests"]["Insert"];
export type OrganizationInsert = Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationMemberInsert = Database["public"]["Tables"]["organization_members"]["Insert"];
export type AgentTelemetryInsert = Database["public"]["Tables"]["agent_telemetry"]["Insert"];
export type EvaluationResultInsert = Database["public"]["Tables"]["evaluation_results"]["Insert"];
export type PolicyViolationInsert = Database["public"]["Tables"]["policy_violations"]["Insert"];
export type WhatsAppMessageInsert = Database["public"]["Tables"]["whatsapp_messages"]["Insert"];
export type AgentScheduleInsert = Database["public"]["Tables"]["agent_schedules"]["Insert"];
export type AgentRunStepInsert = Database["public"]["Tables"]["agent_run_steps"]["Insert"];

// ─── Update aliases ────────────────────────────────────────────────────────
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];
export type EmailUpdate = Database["public"]["Tables"]["emails"]["Update"];
export type CallUpdate = Database["public"]["Tables"]["calls"]["Update"];
export type AgentRunUpdate = Database["public"]["Tables"]["agent_runs"]["Update"];
export type JobUpdate = Database["public"]["Tables"]["job_queue"]["Update"];
export type ApprovalUpdate = Database["public"]["Tables"]["approvals"]["Update"];
export type SignalUpdate = Database["public"]["Tables"]["signals"]["Update"];
export type ContentPostUpdate = Database["public"]["Tables"]["content_posts"]["Update"];
export type KnowledgeBaseUpdate = Database["public"]["Tables"]["knowledge_bases"]["Update"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];
export type MediaAssetUpdate = Database["public"]["Tables"]["media_assets"]["Update"];
export type ConversationUpdate = Database["public"]["Tables"]["conversations"]["Update"];
export type EmailDomainUpdate = Database["public"]["Tables"]["email_domains"]["Update"];
export type ABTestUpdate = Database["public"]["Tables"]["ab_tests"]["Update"];
export type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];
export type AgentScheduleUpdate = Database["public"]["Tables"]["agent_schedules"]["Update"];

// ═══════════════════════════════════════════════════════════════════════════
// LITERAL UNIONS
// ═══════════════════════════════════════════════════════════════════════════

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type CampaignType = "email" | "call" | "multi_channel" | "paid_ads";
export type ContentStatus = "draft" | "pending_approval" | "scheduled" | "published" | "rejected" | "failed";
export type DocumentStatus = "pending" | "processing" | "ready" | "failed";
export type KnowledgeScope = "private" | "shared_with_agents" | "shared_with_team";
export type PlatformSlug = "instagram" | "facebook" | "youtube" | "linkedin" | "tiktok";
export type EmailStatus = "draft" | "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced";
export type CallDirection = "inbound" | "outbound";
export type CallSentiment = "positive" | "neutral" | "negative";
export type AgentRunStatus = "running" | "completed" | "failed" | "pending_approval";
export type JobStatus = "pending" | "processing" | "done" | "failed";
export type Plan = "free" | "starter" | "growth" | "scale" | "enterprise";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type SignalUrgency = "low" | "medium" | "high" | "critical";
export type NotificationKind = "info" | "success" | "warning" | "error" | "approval" | "signal" | "call" | "content";
export type ConversationStatus = "open" | "pending" | "resolved" | "snoozed";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type ConversationChannel = "whatsapp" | "email" | "instagram_dm" | "facebook_messenger" | "threads" | "sms" | "web_chat";
export type ConversationSentiment = "positive" | "neutral" | "negative" | "frustrated";
export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "contact" | "agent" | "human" | "system";
export type MediaType = "image" | "video" | "audio";
export type PostType = "feed" | "story" | "reel" | "carousel" | "thread";
export type BounceType = "hard" | "soft" | "complaint";
export type ABTestType = "subject" | "template" | "send_time";
export type ABTestStatus = "draft" | "running" | "completed" | "paused";
export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type OrgPlan = "free" | "starter" | "growth" | "scale" | "enterprise";
export type PolicyTier = "auto" | "notify" | "approve" | "forbidden";
export type TelemetryEventType = "plan" | "llm_call" | "tool_call" | "tool_result" | "approval" | "error" | "summary";
export type EvaluationScope = "system" | "trace" | "node";
export type WhatsAppCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type WhatsAppTemplateStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAUSED";
