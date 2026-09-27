"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  CreatePostSchema,
  UpdatePostStatusSchema,
  DeletePostSchema,
} from "@/lib/schemas/content";
import type { ContentPost, ContentPostUpdate } from "@/lib/supabase/types";

export type ContentActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function failure(
  message: string,
  fieldErrors?: Record<string, string[]>
): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  return fieldErrors
    ? { ok: false, error: message, fieldErrors }
    : { ok: false, error: message };
}

export async function createPost(
  rawInput: unknown
): Promise<ContentActionResult<ContentPost>> {
  const parsed = CreatePostSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    const clean: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(fe)) if (v && v.length) clean[k] = v;
    return failure("Please check the highlighted fields.", clean);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const input = parsed.data;
  const status: string = input.require_approval
    ? "pending_approval"
    : input.scheduled_for
    ? "scheduled"
    : "draft";

  const { data, error } = await supabase
    .from("content_posts")
    .insert({
      user_id: user.id,
      title: input.title,
      body: input.body,
      platforms: input.platforms as string[],
      scheduled_for: input.scheduled_for ?? null,
      status,
      metadata: { require_approval: input.require_approval },
    })
    .select("*")
    .single();

  if (error) return failure(error.message);
  if (!data) return failure("Insert returned no data");

  revalidatePath("/content");
  return { ok: true, data: data as ContentPost };
}

export async function updatePostStatus(
  rawInput: unknown
): Promise<ContentActionResult<ContentPost>> {
  const parsed = UpdatePostStatusSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const { id, status, rejection_reason } = parsed.data;

  const patch: ContentPostUpdate = { status };
  if (status === "rejected" && rejection_reason) {
    patch.rejection_reason = rejection_reason;
  }
  if (status === "published") {
    patch.approved_by = user.id;
    patch.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("content_posts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return failure(error.message);
  if (!data) return failure("Post not found");

  revalidatePath("/content");
  return { ok: true, data: data as ContentPost };
}

export async function deletePost(
  rawInput: unknown
): Promise<ContentActionResult<{ id: string }>> {
  const parsed = DeletePostSchema.safeParse(rawInput);
  if (!parsed.success) return failure("Invalid input");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Not authenticated");

  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return failure(error.message);

  revalidatePath("/content");
  return { ok: true, data: { id: parsed.data.id } };
}

export const ContentSchemas = z.object({
  create: CreatePostSchema,
});
