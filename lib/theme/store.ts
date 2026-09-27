"use client";

/**
 * Theme store — useSyncExternalStore-compatible.
 *
 * Replaces next-themes, which renders an inline <script> inside a component.
 * React 19 rejects script tags rendered as component children during
 * hydration (React error #441). This store applies the theme class via
 * useEffect instead — no inline script, no hydration mismatch.
 *
 * SSR safety:
 *   getServerTheme()       returns "system"  — stable for server render
 *   getServerResolved()    returns "light"   — stable for server render
 *   First client render    uses server snapshot (matches HTML)
 *   After hydration        React re-reads getSnapshot() and updates
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type Listener = () => void;

const STORAGE_KEY = "setu-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

class ThemeStore {
  private theme: Theme = "system";
  private resolved: ResolvedTheme = "light";
  private listeners = new Set<Listener>();
  private mediaQuery: MediaQueryList | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        this.theme = stored;
      }
    } catch {
      /* localStorage unavailable */
    }

    this.mediaQuery = window.matchMedia(MEDIA_QUERY);
    try {
      this.mediaQuery.addEventListener("change", this.handleMediaChange);
    } catch {
      /* older browsers */
    }
    this.applyTheme();
  }

  private handleMediaChange = (): void => {
    if (this.theme === "system") this.applyTheme();
  };

  private applyTheme(): void {
    if (typeof document === "undefined") return;
    const systemDark = this.mediaQuery?.matches ?? false;
    const next: ResolvedTheme =
      this.theme === "system" ? (systemDark ? "dark" : "light") : this.theme;
    if (next === this.resolved) return;
    this.resolved = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Theme => this.theme;
  getResolvedSnapshot = (): ResolvedTheme => this.resolved;
  getServerSnapshot = (): Theme => "system";
  getServerResolvedSnapshot = (): ResolvedTheme => "light";

  setTheme = (theme: Theme): void => {
    this.theme = theme;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* localStorage unavailable */
      }
    }
    this.applyTheme();
  };

  toggle = (): void => {
    this.setTheme(this.resolved === "dark" ? "light" : "dark");
  };
}

let singleton: ThemeStore | null = null;

export function getThemeStore(): ThemeStore {
  if (!singleton) singleton = new ThemeStore();
  return singleton;
}

export type { ThemeStore };
