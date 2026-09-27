"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostComposer } from "./post-composer";

export function ContentActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="gradient" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New Post
      </Button>
      {open && (
        <PostComposer
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            if (typeof window !== "undefined") window.location.reload();
          }}
        />
      )}
    </>
  );
}
