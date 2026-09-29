import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listNotifications, getUnreadCount } from "@/lib/notifications/queries";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";

export async function AppTopbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  let unread = 0;

  if (user) {
    try {
      [notifications, unread] = await Promise.all([
        listNotifications(user.id, 30),
        getUnreadCount(user.id),
      ]);
    } catch (e) {
      console.error("[topbar] notification fetch failed:", e);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/70 px-3 backdrop-blur-xl md:h-16 md:gap-3 md:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden" aria-label="Setu Kalki">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-sm">
          <Plus className="size-3.5" />
        </span>
        <span className="text-sm font-semibold tracking-tight gradient-text">Setu Kalki</span>
      </Link>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Search anything…" className="h-9 rounded-lg border-border/60 bg-muted/40 pl-9 pr-16 focus-visible:bg-background" />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Search" className="md:hidden">
          <Search className="size-4" />
        </Button>

        {user ? (
          <NotificationBell
            initialItems={notifications}
            initialUnread={unread}
            userId={user.id}
          />
        ) : (
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Search className="size-4" />
          </Button>
        )}

        <ThemeToggle />

        <Link
          href="/settings"
          className="ml-0.5 flex items-center gap-2 rounded-full border bg-card/60 p-0.5 pr-2 md:py-1 md:pl-1 md:pr-3 transition-colors hover:bg-accent"
        >
          <Avatar className="size-7 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-[10px] font-semibold text-white">
              {user?.email?.slice(0, 2).toUpperCase() ?? "SK"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-medium md:inline">
            {user?.email?.split("@")[0] ?? "Operator"}
          </span>
        </Link>
      </div>
    </header>
  );
}
