// CRITICAL
import type { StateCreator } from "zustand";
import type { AgentFileVersion } from "@/lib/types";
import type { ChatSlice } from "../chat-slice-types";

type Set = Parameters<StateCreator<ChatSlice, [], [], ChatSlice>>[0];

export function createAgentActions(set: Set) {
  return {
    setAgentMode: (enabled: boolean) => set({ agentMode: enabled }),
    setAgentPlan: (plan: ChatSlice["agentPlan"]) => set({ agentPlan: plan }),
    setAgentFiles: (files: ChatSlice["agentFiles"]) => set({ agentFiles: files }),
    setAgentFilesLoading: (loading: boolean) => set({ agentFilesLoading: loading }),
    setSelectedAgentFilePath: (path: string | null) => set({ selectedAgentFilePath: path }),
    setSelectedAgentFileContent: (content: string | null) => set({ selectedAgentFileContent: content }),
    setSelectedAgentFileLoading: (loading: boolean) => set({ selectedAgentFileLoading: loading }),
    addAgentFileVersion: (path: string, content: string) =>
      set((state) => {
        const existing = state.agentFileVersions[path] ?? [];
        const last = existing[existing.length - 1];
        if (last?.content === content) return state;
        const nextVersion = (last?.version ?? 0) + 1;
        const nextEntry: AgentFileVersion = {
          version: nextVersion,
          content,
          timestamp: Date.now(),
        };
        return {
          agentFileVersions: {
            ...state.agentFileVersions,
            [path]: [...existing, nextEntry],
          },
        };
      }),
    hydrateAgentFileVersions: (path: string, versions: AgentFileVersion[]) =>
      set((state) => {
        if (!path) return state;
        const incoming = Array.isArray(versions) ? versions : [];
        const existing = state.agentFileVersions[path] ?? [];
        if (incoming.length === 0) return state;
        const lastIncoming = incoming[incoming.length - 1];
        const lastExisting = existing[existing.length - 1];
        if (
          existing.length === incoming.length &&
          lastExisting?.version === lastIncoming?.version &&
          lastExisting?.timestamp === lastIncoming?.timestamp &&
          lastExisting?.content === lastIncoming?.content
        ) {
          return state;
        }
        return {
          agentFileVersions: {
            ...state.agentFileVersions,
            [path]: incoming,
          },
        };
      }),
    moveAgentFileVersions: (from: string, to: string) =>
      set((state) => {
        if (from === to) return state;
        const existing = state.agentFileVersions[from];
        if (!existing) return state;
        const next = { ...state.agentFileVersions };
        delete next[from];
        next[to] = existing;
        return { agentFileVersions: next };
      }),
    clearAgentFileVersions: () => set({ agentFileVersions: {} }),
    setSidebarWidth: (width: number) => set({ sidebarWidth: width }),
    setResultsLastTab: (tab: ChatSlice["resultsLastTab"]) => set({ resultsLastTab: tab }),
    setMobilePlanChipHidden: (hidden: boolean) => set({ mobilePlanChipHidden: hidden }),
  } as const;
}

