"use client";

import { useActionState, useState } from "react";
import { Calendar, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPost, type ContentActionResult } from "@/app/actions/content";
import { PLATFORMS, type PlatformSlug, type ContentPost } from "@/lib/content/types";
import { cn } from "@/lib/utils";

interface PostComposerProps {
  onClose: () => void;
  onCreated?: (post: ContentPost) => void;
}

export function PostComposer({ onClose, onCreated }: PostComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [platforms, setPlatforms] = useState<PlatformSlug[]>(["instagram"]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  const [state, formAction, pending] = useActionState<
    ContentActionResult<ContentPost> | null,
    FormData
  >(async (_prev, formData) => {
    const platformList = formData.getAll("platforms").map(String);
    const result = await createPost({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      platforms: platformList,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      require_approval: requireApproval,
    });
    if (result.ok && onCreated) onCreated(result.data);
    return result;
  }, null);

  function togglePlatform(slug: PlatformSlug) {
    setPlatforms((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const errorMessage = state && !state.ok ? state.error : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-fade-up rounded-2xl border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">New Post</h2>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-3.5" />
          </Button>
        </header>

        <form action={formAction} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your post…"
              rows={5}
              className="resize-none"
              disabled={pending}
              required
            />
            <div className="text-right text-[10px] text-muted-foreground">
              {body.length} / 5000
            </div>
            {fieldErrors?.body && (
              <p className="text-xs text-destructive">{fieldErrors.body[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.slug);
                return (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => togglePlatform(p.slug)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {platforms.map((p) => (
              <input key={p} type="hidden" name="platforms" value={p} />
            ))}
            {fieldErrors?.platforms && (
              <p className="text-xs text-destructive">{fieldErrors.platforms[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled_for">Schedule</Label>
              <Input
                id="scheduled_for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label>Approval</Label>
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  disabled={pending}
                  className="h-4 w-4"
                />
                <span className="text-muted-foreground text-xs">
                  Require approval before publishing
                </span>
              </label>
            </div>
          </div>

          {errorMessage && !fieldErrors && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save Post"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
