// lib/nav.ts
import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
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
  { href: "/services",         label: "Services",       shortLabel: "Services", icon: Network },
  { href: "/dashboard",      label: "Overview",       shortLabel: "Home",     icon: LayoutDashboard, primary: true },
  { href: "/inbox",          label: "Inbox",          shortLabel: "Inbox",    icon: Inbox,           primary: true },
  { href: "/content",        label: "Content Studio", shortLabel: "Content",  icon: FileText,        primary: true },
  { href: "/ads",            label: "Ads Control",    shortLabel: "Ads",      icon: Wallet,          primary: true },
  { href: "/leads",          label: "Leads",          shortLabel: "Leads",    icon: Users,           primary: true },
  { href: "/workforce",      label: "AI Team",        shortLabel: "Team",     icon: Sparkles },
  { href: "/command-center", label: "Command Center", shortLabel: "Ops",      icon: ShieldCheck },
  { href: "/campaigns",      label: "Campaigns",      shortLabel: "Campaigns", icon: Megaphone },
  { href: "/performance",    label: "Performance",    shortLabel: "Perf",     icon: BarChart3 },
  { href: "/analytics",      label: "Analytics",      shortLabel: "Analytics", icon: BarChart3 },
  { href: "/calls",          label: "Calls",          shortLabel: "Calls",    icon: Megaphone },
  { href: "/signals",        label: "Signals",        shortLabel: "Signals",  icon: Sparkles },
  { href: "/settings",       label: "Settings",       shortLabel: "Settings", icon: Settings },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((n) => n.primary);

export function isActivePath(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
