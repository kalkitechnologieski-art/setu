// lib/nav.ts
import {
  BarChart3, Inbox, LayoutDashboard, Megaphone, Settings, ShieldCheck,
  Sparkles, Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge?: string;
  primary?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard",   label: "Overview",     shortLabel: "Home",     icon: LayoutDashboard, primary: true },
  { href: "/ops",         label: "Operations",   shortLabel: "Ops",      icon: ShieldCheck,     badge: "Live", primary: true },
  { href: "/inbox",       label: "Inbox",        shortLabel: "Inbox",    icon: Inbox,           badge: "5", primary: true },
  { href: "/workforce",   label: "Workforce",    shortLabel: "AI Team",  icon: Sparkles,        primary: true },
  { href: "/leads",       label: "Leads",        shortLabel: "Leads",    icon: Users },
  { href: "/campaigns",   label: "Campaigns",    shortLabel: "Campaigns",icon: Megaphone },
  { href: "/performance", label: "Performance",  shortLabel: "Ads",      icon: BarChart3 },
  { href: "/connect",     label: "Connections",  shortLabel: "Connect",  icon: Sparkles },
  { href: "/settings",    label: "Settings",     shortLabel: "Settings", icon: Settings },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((n) => n.primary);

export function isActivePath(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
