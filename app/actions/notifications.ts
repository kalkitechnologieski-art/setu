// app/actions/notifications.ts
// ─────────────────────────────────────────────────────────────────────────
// Server Actions for the notification domain.
//
// Uses the withAction wrapper (lib/actions/guard.ts) which enforces:
//   • Zod validation on every input
//   • Authentication check
//   • Correlation ID for tracing
//   • Typed Result pattern — no thrown errors across the RSC boundary
//   • Supabase error code mapping (23505 → CONFLICT, etc.)
// ─────────────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAction, mapSupabaseError } from "@/lib/actions/guard";
import type { NotificationRow } from "@/lib/notifications/types";

// ─── Schemas ─────────────────────────────────────────────────────────────
const IdSchema = z.object({
  id: z.string().uuid("Invalid notification id"),
});

const BatchIdsSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "At least one id required")
    .max(200, "Maximum 200 ids per batch"),
});

const EmptySchema = z.object({});

// ─── Mark one read ───────────────────────────────────────────────────────
export const markNotificationRead = withAction({
  schema: IdSchema,
  handler: async ({ id }, { userId, supabase }): Promise<NotificationRow> => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw mapSupabaseError(error);
    if (!data) throw mapSupabaseError({ message: "Notification not found" });

    revalidatePath("/", "layout");
    return data as NotificationRow;
  },
});

// ─── Mark all read ───────────────────────────────────────────────────────
export const markAllNotificationsRead = withAction({
  schema: EmptySchema,
  handler: async (
    _input,
    { userId, supabase }
  ): Promise<{ updated: number }> => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)
      .select("id");

    if (error) throw mapSupabaseError(error);

    revalidatePath("/", "layout");
    return { updated: (data ?? []).length };
  },
});

// ─── Mark many read (batch) ──────────────────────────────────────────────
export const markManyNotificationsRead = withAction({
  schema: BatchIdsSchema,
  handler: async (
    { ids },
    { userId, supabase }
  ): Promise<{ updated: number }> => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", ids)
      .is("read_at", null)
      .select("id");

    if (error) throw mapSupabaseError(error);

    revalidatePath("/", "layout");
    return { updated: (data ?? []).length };
  },
});

// ─── Delete one ──────────────────────────────────────────────────────────
export const deleteNotification = withAction({
  schema: IdSchema,
  handler: async (
    { id },
    { userId, supabase }
  ): Promise<{ id: string }> => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw mapSupabaseError(error);

    revalidatePath("/", "layout");
    return { id };
  },
});

// ─── Delete many (batch) ─────────────────────────────────────────────────
export const deleteManyNotifications = withAction({
  schema: BatchIdsSchema,
  handler: async (
    { ids },
    { userId, supabase }
  ): Promise<{ deleted: number }> => {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .in("id", ids)
      .select("id");

    if (error) throw mapSupabaseError(error);

    revalidatePath("/", "layout");
    return { deleted: (data ?? []).length };
  },
});

// ─── Clear read (bulk delete read-only) ──────────────────────────────────
export const clearReadNotifications = withAction({
  schema: EmptySchema,
  handler: async (
    _input,
    { userId, supabase }
  ): Promise<{ deleted: number }> => {
    const { data, error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .not("read_at", "is", null)
      .select("id");

    if (error) throw mapSupabaseError(error);

    revalidatePath("/", "layout");
    return { deleted: (data ?? []).length };
  },
});
