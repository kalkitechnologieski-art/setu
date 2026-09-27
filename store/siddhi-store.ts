// store/siddhi-store.ts
"use client";

import { create } from "zustand";

interface SiddhiState {
  open: boolean;
  fullscreen: boolean;
  pendingQuery: string | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setFullscreen: (fs: boolean) => void;
  toggleFullscreen: () => void;
  openWithQuery: (query: string) => void;
  clearPendingQuery: () => void;
}

export const useSiddhiStore = create<SiddhiState>((set) => ({
  open: false,
  fullscreen: false,
  pendingQuery: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  setFullscreen: (fs) => set({ fullscreen: fs }),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
  openWithQuery: (query) => set({ open: true, pendingQuery: query }),
  clearPendingQuery: () => set({ pendingQuery: null }),
}));
