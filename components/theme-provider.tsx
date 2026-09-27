"use client";

import { useEffect } from "react";
import { getThemeStore } from "@/lib/theme/store";

/**
 * Initializes the theme store on mount.
 *
 * No inline <script> is rendered — that pattern breaks React 19 hydration
 * (React error #441). The store applies the theme class via useEffect
 * after the first client paint.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getThemeStore().init();
  }, []);

  return <>{children}</>;
}
