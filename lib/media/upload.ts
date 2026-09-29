// lib/media/upload.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/jpeg","image/png","image/webp","image/gif",
  "video/mp4","video/quicktime","video/webm",
  "audio/mpeg","audio/wav",
];

const UploadMeta = z.object({
  name: z.string().min(1).max(300),
  type: z.enum(["image","video","audio"]),
  mime_type: z.string().max(100),
  size_bytes: z.number().int().min(1).max(MAX_BYTES),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration_seconds: z.number().int().positive().optional(),
  alt_text: z.string().max(500).optional(),
  tags: z.array(z.string()).max(20).default([]),
});

export type UploadMetaInput = z.infer<typeof UploadMeta>;

export async function createSignedUploadUrl(
  input: unknown
): Promise<{ ok: true; uploadUrl: string; token: string; path: string } | { ok: false; error: string }> {
  const parsed = UploadMeta.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid metadata" };

  if (!ALLOWED_MIME.includes(parsed.data.mime_type)) {
    return { ok: false, error: "File type not allowed" };
  }
  if (parsed.data.size_bytes > MAX_BYTES) {
    return { ok: false, error: "File too large (max 50 MB)" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const ext = parsed.data.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUploadUrl(path);

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create upload URL" };

  return {
    ok: true,
    uploadUrl: data.signedUrl,
    token: data.token,
    path: data.path ?? path,
  };
}

export async function recordMediaAsset(
  input: unknown & { storage_path: string; thumbnail_path?: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = UploadMeta.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid metadata" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      mime_type: parsed.data.mime_type,
      size_bytes: parsed.data.size_bytes,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
      duration_seconds: parsed.data.duration_seconds ?? null,
      alt_text: parsed.data.alt_text ?? null,
      tags: parsed.data.tags,
      storage_path: input.storage_path,
      thumbnail_path: input.thumbnail_path ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };

  revalidatePath("/content/media");
  return { ok: true, id: data.id };
}
