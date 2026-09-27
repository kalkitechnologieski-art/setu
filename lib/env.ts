// lib/env.ts
// ═══════════════════════════════════════════════════════════════════════════
// Runtime environment validation.
//
// Imported by the health endpoint and any server module that needs
// guaranteed-present config. Missing required variables throw at first
// access so the failure is loud and local — not a silent `undefined` deep
// inside a request handler.
// ═══════════════════════════════════════════════════════════════════════════

const PLACEHOLDER = "__SET_ME__";

interface VarSpec {
  name: string;
  required: boolean;
  group: "supabase" | "llm" | "email" | "telephony" | "platforms" | "app";
  description: string;
}

const SPECS: readonly VarSpec[] = [
  // Supabase — required
  { name: "NEXT_PUBLIC_SUPABASE_URL",              required: true,  group: "supabase",  description: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",  required: true,  group: "supabase",  description: "Supabase anon/publishable key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY",             required: false, group: "supabase",  description: "Service role key (admin operations)" },

  // LLM — at least one required
  { name: "GROQ_API_KEY",                          required: false, group: "llm",       description: "Groq (primary LLM)" },
  { name: "GEMINI_API_KEY",                        required: false, group: "llm",       description: "Google Gemini (fallback 1)" },
  { name: "OPENROUTER_API_KEY",                    required: false, group: "llm",       description: "OpenRouter (fallback 2)" },

  // Email
  { name: "RESEND_API_KEY",                        required: false, group: "email",     description: "Resend email" },

  // Telephony
  { name: "AGENTCALL_API_KEY",                     required: false, group: "telephony", description: "AgentCall telephony" },

  // Platform OAuth
  { name: "GOOGLE_ADS_CLIENT_ID",                  required: false, group: "platforms", description: "Google Ads OAuth client ID" },
  { name: "GOOGLE_ADS_CLIENT_SECRET",              required: false, group: "platforms", description: "Google Ads OAuth client secret" },
  { name: "META_ADS_CLIENT_ID",                    required: false, group: "platforms", description: "Meta Ads OAuth client ID" },
  { name: "META_ADS_CLIENT_SECRET",                required: false, group: "platforms", description: "Meta Ads OAuth client secret" },

  // Cron
  { name: "CRON_SECRET",                           required: false, group: "platforms", description: "Cron authorization secret" },

  // App
  { name: "NEXT_PUBLIC_APP_URL",                   required: true,  group: "app",       description: "Public app URL" },
];

export interface EnvReport {
  ok: boolean;
  missingRequired: readonly string[];
  missingOptional: readonly string[];
  present: readonly string[];
}

export function inspectEnv(): EnvReport {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const present: string[] = [];

  for (const spec of SPECS) {
    const raw = process.env[spec.name];
    const value = typeof raw === "string" ? raw.trim() : "";
    const isSet = value.length > 0 && value !== PLACEHOLDER;

    if (isSet) {
      present.push(spec.name);
    } else if (spec.required) {
      missingRequired.push(spec.name);
    } else {
      missingOptional.push(spec.name);
    }
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    present,
  };
}

/** Throws if any required env var is missing. */
export function requireEnv(): void {
  const report = inspectEnv();
  if (!report.ok) {
    throw new Error(
      `Missing required environment variables: ${report.missingRequired.join(", ")}. ` +
        `Run: ./phase2.sh add-keys`
    );
  }
}
