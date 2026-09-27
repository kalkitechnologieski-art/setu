// app/actions/leads.ts
"use server";

import { revalidatePath } from "next/cache";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  LeadQuerySchema,
} from "@/lib/schemas/lead";
import type { ActionResult } from "@/lib/types/action";
import type { Lead, LeadInsert, LeadUpdate } from "@/lib/supabase/types";

// ─── CREATE ────────────────────────────────────────────────────────────────

export const createLead = withAction({
  schema: CreateLeadSchema,
  handler: async (input, { userId, supabase }): Promise<Lead> => {
    const payload: LeadInsert = {
      user_id: userId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      company: input.company || null,
      title: input.title || null,
      source: input.source,
      score: input.score,
      status: input.status,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Insert returned no data" });

    revalidatePath("/dashboard/leads");
    return data;
  },
});

// ─── UPDATE ────────────────────────────────────────────────────────────────

export const updateLead = withAction({
  schema: UpdateLeadSchema,
  handler: async (input, { userId, supabase }): Promise<Lead> => {
    const { id, ...rest } = input;

    const patch: LeadUpdate = {};
    if (rest.name !== undefined)    patch.name = rest.name;
    if (rest.email !== undefined)   patch.email = rest.email;
    if (rest.phone !== undefined)   patch.phone = rest.phone || null;
    if (rest.company !== undefined) patch.company = rest.company || null;
    if (rest.title !== undefined)   patch.title = rest.title || null;
    if (rest.score !== undefined)   patch.score = rest.score;
    if (rest.status !== undefined)  patch.status = rest.status;

    const { data, error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId)  // belt-and-suspenders alongside RLS
      .select()
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Lead not found" });

    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${id}`);
    return data;
  },
});

// ─── DELETE ────────────────────────────────────────────────────────────────

import { z } from "zod";
const DeleteLeadSchema = z.object({ id: z.string().uuid() });

export const deleteLead = withAction({
  schema: DeleteLeadSchema,
  handler: async ({ id }, { userId, supabase }): Promise<{ id: string }> => {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw mapSupabaseError(error);

    revalidatePath("/dashboard/leads");
    return { id };
  },
});

// ─── LIST (read-only, still wrapped for consistency) ───────────────────────

export const listLeads = withAction({
  schema: LeadQuerySchema,
  handler: async (query, { userId, supabase }): Promise<Lead[]> => {
    let q = supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(query.limit);

    if (query.status) q = q.eq("status", query.status);
    if (query.q)      q = q.or(`name.ilike.%${query.q}%,email.ilike.%${query.q}%,company.ilike.%${query.q}%`);
    if (query.cursor) q = q.lt("created_at", query.cursor);

    const { data, error } = await q;
    if (error) throw mapSupabaseError(error);
    return data ?? [];
  },
});

// Re-export the action result type for client consumers
export type LeadActionResult<T> = ActionResult<T>;
