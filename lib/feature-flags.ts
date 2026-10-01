// lib/feature-flags.ts
// Flag evaluation with deterministic percentage rollout.
// Reads from feature_flags table, cached for 60s.

import { cache, CACHE_TTL } from "./cache";
import { logger } from "./logger";
import { untypedTable } from "@/lib/db/untyped";

export interface FlagContext {
  userId?: string;
  orgId?: string;
  plan?: string;
}

interface FlagRow {
  name: string;
  default_value: boolean;
  rollout_percentage: number;
  org_allowlist: string[] | null;
  user_allowlist: string[] | null;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

async function loadFlag(name: string): Promise<FlagRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "__SET_ME__") return null;

  try {
    const chain = untypedTable("feature_flags")
      .select("name, default_value, rollout_percentage, org_allowlist, user_allowlist")
      .eq("name", name);

    const result = await chain.maybeSingle();
    if (result.error || !result.data) return null;
    return result.data as unknown as FlagRow;
  } catch (e) {
    logger.warn("flag_load_failed", {
      name,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

export async function isEnabled(
  flagName: string,
  context: FlagContext = {}
): Promise<boolean> {
  const cacheKey = `flag:${flagName}`;
  let flag = cache.get<FlagRow>(cacheKey);

  if (!flag) {
    const loaded = await loadFlag(flagName);
    if (loaded) {
      flag = loaded;
      cache.set(cacheKey, flag, CACHE_TTL.short);
    }
  }

  if (!flag) return false;

  if (flag.org_allowlist && context.orgId && flag.org_allowlist.includes(context.orgId)) {
    return true;
  }
  if (flag.user_allowlist && context.userId && flag.user_allowlist.includes(context.userId)) {
    return true;
  }

  const rollout = typeof flag.rollout_percentage === "number" ? flag.rollout_percentage : 0;
  if (rollout >= 100) return flag.default_value;
  if (rollout <= 0) return false;

  const seed = `${flagName}:${context.orgId ?? context.userId ?? "anon"}`;
  return simpleHash(seed) % 100 < rollout;
}

export async function evaluateFlags(
  names: string[],
  context: FlagContext = {}
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(
    names.map(async (name) => {
      out[name] = await isEnabled(name, context);
    })
  );
  return out;
}

export function invalidateFlagCache(name?: string): number {
  if (name) return cache.invalidate(`flag:${name}`);
  return cache.invalidate("flag:*");
}
