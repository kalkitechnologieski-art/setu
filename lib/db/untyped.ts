// lib/db/untyped.ts
// Escape hatch for tables not yet reflected in lib/supabase/types.ts.
// Used by Phase 1 layers that add tables without regenerating types.
// The narrow interface keeps call sites honest about what they can do.

import { createAdminClient } from "@/lib/supabase/admin";

interface InsertResult {
  error: { message: string } | null;
}

interface SelectChain {
  eq: (col: string, val: unknown) => SelectChain;
  gte: (col: string, val: unknown) => SelectChain;
  lte: (col: string, val: unknown) => SelectChain;
  order: (col: string, opts?: { ascending?: boolean }) => SelectChain;
  limit: (n: number) => SelectChain;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
  single: () => Promise<{
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  }>;
  then: <T>(
    onfulfilled: (v: {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    }) => T
  ) => Promise<T>;
}

interface UpdateChain {
  eq: (col: string, val: unknown) => Promise<InsertResult>;
}

interface UntypedTable {
  insert: (row: Record<string, unknown> | Record<string, unknown>[]) => Promise<InsertResult>;
  update: (patch: Record<string, unknown>) => UpdateChain;
  select: (cols?: string) => SelectChain;
  delete: () => UpdateChain;
}

export function untypedTable(name: string): UntypedTable {
  const client = createAdminClient();
  const fromUntyped = (client as unknown as {
    from: (t: string) => UntypedTable;
  }).from;
  return fromUntyped.call(client, name);
}

// ─── queryRows — convenience wrapper for untyped selects ────────────────
export async function queryRows(
  table: string,
  filters: Record<string, unknown> = {},
  options: {
    orderBy?: string;
    limit?: number;
    ascending?: boolean;
  } = {}
): Promise<Record<string, unknown>[]> {
  try {
    const t = untypedTable(table);
    let chain = t.select("*");
    for (const [key, val] of Object.entries(filters)) {
      chain = chain.eq(key, val);
    }
    if (options.orderBy) {
      chain = chain.order(options.orderBy, {
        ascending: options.ascending ?? false,
      });
    }
    if (options.limit) {
      chain = chain.limit(options.limit);
    }
    const result = await chain.then((v) => v);
    return result.data ?? [];
  } catch {
    return [];
  }
}

// ─── queryOne — first matching row or null ──────────────────────────────
export async function queryOne(
  table: string,
  filters: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  try {
    const t = untypedTable(table);
    let chain = t.select("*");
    for (const [key, val] of Object.entries(filters)) {
      chain = chain.eq(key, val);
    }
    const result = await chain.maybeSingle();
    if (result.error || !result.data) return null;
    return result.data;
  } catch {
    return null;
  }
}

// ─── countRows — count matching rows ────────────────────────────────────
export async function countRows(
  table: string,
  filters: Record<string, unknown> = {}
): Promise<number> {
  try {
    const rows = await queryRows(table, filters, { limit: 10000 });
    return rows.length;
  } catch {
    return 0;
  }
}
