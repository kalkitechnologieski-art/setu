// lib/keyboard/registry.ts

export interface Shortcut {
  keys: string;
  label: string;
  group: "Global" | "Navigation" | "Actions";
}

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: "⌘K",       label: "Open command palette",      group: "Global" },
  { keys: "⌘J",       label: "Toggle Siddhi assistant",   group: "Global" },
  { keys: "⌘⇧J",      label: "Siddhi full screen",        group: "Global" },
  { keys: "?",        label: "Show shortcuts",            group: "Global" },
  { keys: "Esc",      label: "Close modal / panel",       group: "Global" },
  { keys: "G then D", label: "Go to Overview",            group: "Navigation" },
  { keys: "G then C", label: "Go to Content Studio",      group: "Navigation" },
  { keys: "G then A", label: "Go to Ads Control Tower",   group: "Navigation" },
  { keys: "G then L", label: "Go to Leads",               group: "Navigation" },
  { keys: "G then W", label: "Go to Workforce",           group: "Navigation" },
  { keys: "G then N", label: "Go to Analytics",           group: "Navigation" },
  { keys: "N",        label: "New lead / post",           group: "Actions" },
];

export const NAV_PATHS: Record<string, string> = {
  d: "/dashboard",
  c: "/content",
  a: "/ads",
  l: "/leads",
  w: "/workforce",
  n: "/analytics",
};
