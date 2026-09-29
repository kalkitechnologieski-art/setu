import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PremiumEmpty } from "@/components/shared/premium-empty";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { MediaGrid } from "@/components/media/media-grid";
import type { MediaAsset } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/content/media");

  const { data: assets } = await supabase
    .from("media_assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const typedAssets = (assets ?? []) as MediaAsset[];

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight gradient-text">
          Media Library
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload, organise, and reuse images, videos, and audio across every post.
        </p>
      </div>

      <WidgetBoundary label="Media Library">
        {typedAssets.length === 0 ? (
          <PremiumEmpty
            icon={ImageIcon}
            eyebrow="Media"
            title="Your library is empty"
            description="Upload images or videos to reuse across Instagram, Facebook, Threads, and WhatsApp. Drag and drop anywhere on this page."
            primaryAction={{ label: "Upload your first asset", variant: "gradient" }}
          />
        ) : (
          <MediaGrid initialAssets={typedAssets} />
        )}
      </WidgetBoundary>
    </div>
  );
}
