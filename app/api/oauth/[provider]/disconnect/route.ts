// app/api/oauth/[provider]/disconnect/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isProviderKey } from "@/lib/auth/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  connection_id: z.string().uuid(),
});

/**
 * Disconnect a platform. Deletes the Vault secrets and the connection row.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!isProviderKey(provider)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Verify ownership
  const { data: conn } = await supabase
    .from("platform_connections")
    .select("id, user_id, provider")
    .eq("id", parsed.connection_id)
    .eq("user_id", user.id)
    .single();

  if (!conn || conn.provider !== provider) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Delete both Vault secrets (ignore errors — they may already be gone)
  await supabase.rpc("delete_platform_secret", {
    p_connection_id: conn.id,
    p_kind: "access",
  });
  await supabase.rpc("delete_platform_secret", {
    p_connection_id: conn.id,
    p_kind: "refresh",
  });

  // Delete the row
  await supabase.from("platform_connections").delete().eq("id", conn.id);

  // Audit
  await supabase.from("auth_events").insert({
    user_id: user.id,
    event_type: "platform_revoked",
    provider,
    metadata: { connection_id: conn.id },
  });

  return NextResponse.json({ ok: true });
}
