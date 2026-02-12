// CRITICAL
"use client";

import { useCallback } from "react";
import api from "@/lib/api";
import { useAppStore } from "@/store";
import type { ChatSession } from "@/lib/types";

export interface UseChatTitleGeneratorArgs {
  selectedModel: string;
  setCurrentSessionTitle: (next: string) => void;
  updateSessions: (fn: (sessions: ChatSession[]) => ChatSession[]) => void;
}

export function useChatTitleGenerator({
  selectedModel,
  setCurrentSessionTitle,
  updateSessions,
}: UseChatTitleGeneratorArgs) {
  return useCallback(
    async (sessionId: string, userContent: string, assistantContent: string) => {
      const applyTitle = async (title: string) => {
        const trimmed = title?.trim();
        if (!trimmed || trimmed === "New Chat") return null;

        // Avoid overwriting an already-titled session (e.g. if run_end triggers later).
        const state = useAppStore.getState();
        const latestTitle =
          state.currentSessionId === sessionId
            ? state.currentSessionTitle
            : state.sessions.find((s) => s.id === sessionId)?.title;
        if (latestTitle && latestTitle !== "New Chat" && latestTitle !== "Chat") {
          return null;
        }

        await api.updateChatSession(sessionId, { title: trimmed });
        setCurrentSessionTitle(trimmed);
        updateSessions((sessions) =>
          sessions.map((session) => (session.id === sessionId ? { ...session, title: trimmed } : session)),
        );
        return trimmed;
      };

      // Prefer controller-backed title generation (LLM) via proxy, fallback to local heuristic.
      try {
        const llmRes = await fetch("/api/proxy/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            user: userContent,
            assistant: assistantContent,
          }),
        });

        if (llmRes.ok) {
          const data = await llmRes.json();
          const title = typeof data?.title === "string" ? data.title.trim() : "";
          const applied = await applyTitle(title);
          if (applied) return applied;
        }
      } catch (err) {
        console.warn("LLM title generation failed; falling back to heuristic:", err);
      }

      try {
        const heuristicRes = await fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            user: userContent,
            assistant: assistantContent,
          }),
        });

        if (heuristicRes.ok) {
          const data = await heuristicRes.json();
          const title = typeof data?.title === "string" ? data.title.trim() : "";
          const applied = await applyTitle(title);
          if (applied) return applied;
        }
      } catch (err) {
        console.error("Heuristic title generation failed:", err);
      }

      return null;
    },
    [selectedModel, setCurrentSessionTitle, updateSessions],
  );
}
