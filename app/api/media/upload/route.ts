import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MediaAsset } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/wav",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const kind: "image" | "video" | "audio" =
      file.type.startsWith("image/") ? "image"
      : file.type.startsWith("video/") ? "video"
      : "audio";

    const { data: asset, error: dbError } = await supabase
      .from("media_assets")
      .insert({
        user_id: user.id,
        name: file.name,
        type: kind,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (dbError || !asset) {
      // Rollback storage on DB failure
      await supabase.storage.from("media").remove([storagePath]);
      return NextResponse.json(
        { error: dbError?.message ?? "Failed to record asset" },
        { status: 500 }
      );
    }

    const typedAsset = asset as MediaAsset;
    return NextResponse.json({ asset: typedAsset });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
