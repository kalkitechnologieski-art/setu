"use client";

import { useSyncExternalStore } from "react";
import { getThemeStore, type ResolvedTheme, type Theme } from "./store";

export interface UseThemeResult {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): UseThemeResult {
  const store = getThemeStore();

  const theme = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const resolvedTheme = useSyncExternalStore(
    store.subscribe,
    store.getResolvedSnapshot,
    store.getServerResolvedSnapshot
  );

  return {
    theme,
    resolvedTheme,
    setTheme: store.setTheme,
  };
}
