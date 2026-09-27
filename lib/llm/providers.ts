// lib/llm/providers.ts

export type ProviderName = "groq" | "gemini" | "openrouter";

export interface ProviderConfig {
  name: ProviderName;
  model: string;
  endpoint: string;
  rpm: number;
  rpd: number;
  envKey: string;
}

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: {
    name: "groq",
    model: "llama-3.1-8b-instant",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    rpm: 30,
    rpd: 14400,
    envKey: "GROQ_API_KEY",
  },
  gemini: {
    name: "gemini",
    model: "gemini-2.5-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    rpm: 15,
    rpd: 1500,
    envKey: "GEMINI_API_KEY",
  },
  openrouter: {
    name: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    rpm: 20,
    rpd: 50,
    envKey: "OPENROUTER_API_KEY",
  },
};

export const PROVIDER_CHAIN: ProviderName[] = ["groq", "gemini", "openrouter"];
