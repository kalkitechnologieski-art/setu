// lib/agents/registry.ts
// ═══════════════════════════════════════════════════════════════════════════
// Typed agent metadata — the four AI employees that compose the Setu workforce.
// ═══════════════════════════════════════════════════════════════════════════

export type AgentSlug = "arjun" | "meera" | "kabir" | "siddhi";

export type AgentRole =
  | "Outbound SDR"
  | "Voice Agent"
  | "Nurture Writer"
  | "Performance Marketing Lead";

export interface AgentMeta {
  slug: AgentSlug;
  name: string;
  role: AgentRole;
  tagline: string;
  /** Tailwind gradient classes for the avatar ring. */
  accent: string;
  /** Hex used for chart series. */
  color: string;
  /** Primary capabilities, shown as chips on the card. */
  capabilities: readonly string[];
  /** Autonomy mode — governs whether writes need approval by default. */
  autonomy: "suggest" | "confirm" | "auto_with_rules" | "draft";
}

export const AGENTS: readonly AgentMeta[] = [
  {
    slug: "arjun",
    name: "Arjun",
    role: "Outbound SDR",
    tagline: "Finds, enriches, and scores leads against your ICP.",
    accent: "from-violet-500 to-indigo-500",
    color: "#8b5cf6",
    capabilities: ["Lead discovery", "Enrichment", "ICP scoring", "Semantic search"],
    autonomy: "suggest",
  },
  {
    slug: "meera",
    name: "Meera",
    role: "Voice Agent",
    tagline: "Places AI calls, transcribes, and extracts intent.",
    accent: "from-blue-500 to-cyan-500",
    color: "#3b82f6",
    capabilities: ["AI calling", "SMS outreach", "Transcripts", "Sentiment"],
    autonomy: "confirm",
  },
  {
    slug: "kabir",
    name: "Kabir",
    role: "Nurture Writer",
    tagline: "Drafts sequences, personalises, and A/B tests.",
    accent: "from-emerald-500 to-teal-500",
    color: "#10b981",
    capabilities: ["Email sequences", "Personalisation", "A/B testing", "Reply handling"],
    autonomy: "auto_with_rules",
  },
  {
    slug: "siddhi",
    name: "Siddhi",
    role: "Performance Marketing Lead",
    tagline: "Monitors ROAS across platforms and drafts reallocations.",
    accent: "from-amber-500 to-orange-500",
    color: "#f59e0b",
    capabilities: ["Campaign creation", "Budget optimisation", "Cross-platform analysis", "ROAS"],
    autonomy: "draft",
  },
] as const;

export function getAgent(slug: AgentSlug): AgentMeta | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export function isAgentSlug(v: string): v is AgentSlug {
  return (AGENTS as readonly AgentMeta[]).some((a) => a.slug === v);
}

