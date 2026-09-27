// lib/nav.ts
import {
  BarChart3, Inbox, LayoutDashboard, Megaphone, Settings, ShieldCheck,
  Sparkles, Users, FileText, Wallet,
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
  { href: "/dashboard",   label: "Overview",       shortLabel: "Home",     icon: LayoutDashboard, primary: true },
  { href: "/command-center", label: "Command Center", shortLabel: "Ops",   icon: ShieldCheck,     primary: true },
  { href: "/inbox",       label: "Inbox",           shortLabel: "Inbox",   icon: Inbox,           primary: true },
  { href: "/leads",       label: "Leads",           shortLabel: "Leads",   icon: Users,           primary: true },
  { href: "/campaigns",   label: "Campaigns",       shortLabel: "Campaigns", icon: Megaphone,     primary: true },
  { href: "/workforce",   label: "AI Team",         shortLabel: "Team",    icon: Sparkles },
  { href: "/performance", label: "Performance",     shortLabel: "Ads",     icon: BarChart3 },
  { href: "/analytics",   label: "Analytics",       shortLabel: "Analytics", icon: BarChart3 },
  { href: "/calls",       label: "Calls",           shortLabel: "Calls",   icon: Megaphone },
  { href: "/signals",     label: "Signals",         shortLabel: "Signals", icon: Sparkles },
  { href: "/settings",    label: "Settings",        shortLabel: "Settings", icon: Settings },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((n) => n.primary);

export function isActivePath(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
