// CRITICAL
import type { StateCreator } from "zustand";
import type { ChatSlice } from "../chat-slice-types";

type Set = Parameters<StateCreator<ChatSlice, [], [], ChatSlice>>[0];

export function createToastActions(set: Set) {
  return {
    pushToast: (toast: Omit<ChatSlice["toasts"][number], "id" | "createdAt" | "expanded"> & { dedupeKey?: string }) =>
      set((state) => {
        const dedupeKey = toast.dedupeKey?.trim();
        if (dedupeKey) {
          const existing = state.toasts.find((t) => t.dedupeKey === dedupeKey);
          if (existing) return state;
        }

        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return {
          toasts: [
            {
              id,
              kind: toast.kind,
              title: toast.title,
              message: toast.message,
              detail: toast.detail,
              createdAt: Date.now(),
              expanded: false,
              dedupeKey: dedupeKey || undefined,
            },
            ...state.toasts,
          ].slice(0, 8),
        };
      }),
    closeToast: (id: string) =>
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
    toggleToastExpanded: (id: string) =>
      set((state) => ({
        toasts: state.toasts.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)),
      })),
  } as const;
}

