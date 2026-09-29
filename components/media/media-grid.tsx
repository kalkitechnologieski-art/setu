"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Upload, Trash2, Copy, Loader2, ImageIcon, Film, Music, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/supabase/types";

type FilterKey = "all" | "image" | "video" | "audio";

const FILTERS: Array<{ key: FilterKey; label: string; icon: typeof ImageIcon }> = [
  { key: "all",   label: "All",    icon: ImageIcon },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Film },
  { key: "audio", label: "Audio",  icon: Music },
];

export function MediaGrid({ initialAssets }: { initialAssets: MediaAsset[] }) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? assets : assets.filter((a) => a.type === filter)),
    [assets, filter]
  );

  const handleFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Upload failed");
          continue;
        }
        const { asset } = (await res.json()) as { asset: MediaAsset };
        setAssets((prev) => [asset, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const copyUrl = async (asset: MediaAsset) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${asset.storage_path}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "space-y-5 rounded-2xl border-2 border-dashed p-4 transition-all",
        dragging
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-transparent"
      )}
    >
      {/* Filter + upload bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border bg-card/60 p-1">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                filter === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
          />
          <Button variant="gradient" size="sm" asChild>
            <span>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload
            </span>
          </Button>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} assets yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((asset) => {
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${asset.storage_path}`;
            const copied = copiedId === asset.id;
            return (
              <div
                key={asset.id}
                className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/30 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
              >
                {asset.type === "image" ? (
                  <Image
                    src={url}
                    alt={asset.alt_text ?? asset.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    {asset.type === "video" ? <Film className="size-6" /> : <Music className="size-6" />}
                    <span className="text-[10px] uppercase tracking-wider">{asset.type}</span>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void copyUrl(asset)}
                    aria-label="Copy URL"
                    className="hover:bg-white/20"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-white" />}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete"
                    className="hover:bg-white/20"
                  >
                    <Trash2 className="size-3.5 text-rose-400" />
                  </Button>
                </div>

                <div className="pointer-events-none absolute bottom-2 left-2 right-2">
                  <p className="truncate text-[10px] font-medium text-white drop-shadow">
                    {asset.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
