// lib/reply-classifier/classify.ts
// ─────────────────────────────────────────────────────────────────────────
// Structured-output intent classifier. Falls back gracefully when the LLM
// is unavailable — always returns a valid classification.
// ─────────────────────────────────────────────────────────────────────────

import { routeLLM } from "@/lib/llm/router";

export type ReplyIntent =
  | "INTERESTED" | "NOT_INTERESTED" | "QUESTION"
  | "OUT_OF_OFFICE" | "UNSUBSCRIBE" | "REFERRAL" | "OTHER";

export interface ClassificationResult {
  intent: ReplyIntent;
  confidence: number;
  suggestedAction: string;
  source: "llm" | "heuristic";
}

const ALL_INTENTS: readonly ReplyIntent[] = [
  "INTERESTED","NOT_INTERESTED","QUESTION",
  "OUT_OF_OFFICE","UNSUBSCRIBE","REFERRAL","OTHER",
] as const;

// Heuristic keywords for instant fallback
const HEURISTICS: Array<{ intent: ReplyIntent; patterns: RegExp }> = [
  { intent: "UNSUBSCRIBE", patterns: /\b(unsubscribe|stop|remove me|opt out)\b/i },
  { intent: "OUT_OF_OFFICE", patterns: /\b(out of (the )?office|on vacation|away until|auto.?reply)\b/i },
  { intent: "INTERESTED", patterns: /\b(interested|let'?s (talk|schedule|meet)|book a call|demo|yes please)\b/i },
  { intent: "NOT_INTERESTED", patterns: /\b(not interested|no thanks|pass|decline)\b/i },
  { intent: "REFERRAL", patterns: /\b(forward(ing)? (this )?to|cc'?ing|speak to|reach out to)\b/i },
  { intent: "QUESTION", patterns: /\?\s*$/ },
];

function heuristicClassify(text: string): ClassificationResult {
  for (const { intent, patterns } of HEURISTICS) {
    if (patterns.test(text)) {
      return { intent, confidence: 0.6, suggestedAction: actionFor(intent), source: "heuristic" };
    }
  }
  return { intent: "OTHER", confidence: 0.4, suggestedAction: "Route to human", source: "heuristic" };
}

function actionFor(intent: ReplyIntent): string {
  switch (intent) {
    case "INTERESTED": return "Offer Cal.com booking link";
    case "NOT_INTERESTED": return "Pause sequence, mark lost";
    case "QUESTION": return "Route to human, draft answer";
    case "OUT_OF_OFFICE": return "Snooze conversation, retry later";
    case "UNSUBSCRIBE": return "Suppress contact, remove from all sequences";
    case "REFERRAL": return "Log referral, add contact";
    default: return "Route to human";
  }
}

export async function classifyReply(replyText: string): Promise<ClassificationResult> {
  if (!replyText.trim()) return heuristicClassify("");

  try {
    const result = await routeLLM({
      messages: [
        {
          role: "system",
          content:
            "You classify B2B outreach replies. Respond ONLY with valid JSON matching this schema: " +
            `{"intent": "${ALL_INTENTS.join("|")}", "confidence": 0.0-1.0, "suggestedAction": "..."}` +
            " No prose, no markdown fences.",
        },
        { role: "user", content: `Reply: ${replyText}` },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });

    const cleaned = result.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as {
      intent?: string;
      confidence?: number;
      suggestedAction?: string;
    };

    const intent = ALL_INTENTS.includes(parsed.intent as ReplyIntent)
      ? (parsed.intent as ReplyIntent)
      : "OTHER";

    return {
      intent,
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
      suggestedAction: parsed.suggestedAction ?? actionFor(intent),
      source: "llm",
    };
  } catch {
    return heuristicClassify(replyText);
  }
}
