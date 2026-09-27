"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, LayoutDashboard, Megaphone, Settings, Sparkles, Users,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "cmdk";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="mr-2 size-4" /> Overview
          </CommandItem>
          <CommandItem onSelect={() => go("/inbox")}>
            <Sparkles className="mr-2 size-4" /> Inbox
          </CommandItem>
          <CommandItem onSelect={() => go("/workforce")}>
            <Sparkles className="mr-2 size-4" /> Workforce
          </CommandItem>
          <CommandItem onSelect={() => go("/leads")}>
            <Users className="mr-2 size-4" /> Leads
          </CommandItem>
          <CommandItem onSelect={() => go("/campaigns")}>
            <Megaphone className="mr-2 size-4" /> Campaigns
          </CommandItem>
          <CommandItem onSelect={() => go("/performance")}>
            <BarChart3 className="mr-2 size-4" /> Performance
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 size-4" /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

