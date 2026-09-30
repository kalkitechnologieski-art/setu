"use client";

// components/content/platform-preview.tsx
// Live render showing how the post will look on each platform.
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPreviewProps {
  platform: "instagram" | "facebook" | "youtube" | "linkedin" | "tiktok";
  body: string;
  mediaUrls?: string[];
  title?: string;
  className?: string;
}

export function PlatformPreview({
  platform,
  body,
  mediaUrls = [],
  title,
  className,
}: PlatformPreviewProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
        <div>
          <div className="text-xs font-semibold">your_brand</div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {platform}
          </div>
        </div>
      </div>

      {mediaUrls.length > 0 && (
        <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            src={mediaUrls[0]}
            alt="Post preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {!mediaUrls.length && (
        <div className="mb-2 flex aspect-square items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            Add media to preview
          </p>
        </div>
      )}

      {title && (
        <div className="mb-1 text-sm font-semibold tracking-tight">{title}</div>
      )}

      <p className="line-clamp-3 text-xs leading-relaxed">
        {body || "Your post content will appear here."}
      </p>

      <div className="mt-3 flex items-center gap-3 border-t pt-2 text-muted-foreground">
        <Heart className="size-4" />
        <MessageCircle className="size-4" />
        <Send className="size-4" />
        <Bookmark className="ml-auto size-4" />
      </div>
    </div>
  );
}
