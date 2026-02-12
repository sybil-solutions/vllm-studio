// CRITICAL
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { CompactionEvent } from "@/lib/services/context-management";
import type { ChatSessionDetail } from "@/lib/types";
import type { UseChatCompactionArgs } from "./use-chat-compaction/types";

export function useChatCompaction(args: UseChatCompactionArgs) {
  const {
    currentSessionId,
    currentSessionTitle,
    selectedModel,
    effectiveSystemPrompt,
    messages,
    isLoading,
    maxContext,
    contextStats,
    contextConfig,
    contextMessages,
    calculateMessageTokens,
    mapStoredMessages,
    buildContextContent,
    updateSessions,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setMessages,
    hydrateAgentState,
    loadAgentFiles,
    sessionIdRef,
    clearArtifactsCache,
  } = args;

  const [compactionHistory, setCompactionHistory] = useState<CompactionEvent[]>([]);
  const [compacting, setCompacting] = useState(false);
  const [compactionError, setCompactionError] = useState<string | null>(null);
  const lastCompactionSignatureRef = useRef<string | null>(null);

  const requestCompaction = useCallback(
    async (title: string) => {
      if (!currentSessionId) {
        throw new Error("No active session for compaction");
      }
      return api.compactChatSession(currentSessionId, {
        model: selectedModel || undefined,
        system: effectiveSystemPrompt?.trim() || undefined,
        title,
      });
    },
    [currentSessionId, effectiveSystemPrompt, selectedModel],
  );

  const performCompaction = useCallback(
    async ({
      reason,
      requireThreshold,
    }: {
      reason: "auto" | "manual";
      requireThreshold: boolean;
    }) => {
      if (!contextStats || !maxContext) return;
      if (compacting || isLoading) return;
      if (requireThreshold && contextStats.utilization < contextConfig.compactionThreshold) return;
      if (!selectedModel || messages.length < 2) return;
      if (!currentSessionId) return;

      const signature = `${currentSessionId || "new"}-${messages.length}-${contextStats.currentTokens}`;
      if (reason === "auto") {
        if (lastCompactionSignatureRef.current === signature) return;
        lastCompactionSignatureRef.current = signature;
      }

      setCompacting(true);
      setCompactionError(null);

      try {
        const compactedTitle =
          currentSessionTitle && !["New Chat", "Chat"].includes(currentSessionTitle)
            ? `${currentSessionTitle} (Compacted)`
            : "Compacted Chat";

        const beforeTokens = calculateMessageTokens(contextMessages);
        const result = await requestCompaction(compactedTitle);

        if (!result?.summary) {
          throw new Error("Empty compaction summary");
        }

        const compactedSession = result.session as ChatSessionDetail;
        const storedMessages = compactedSession.messages ?? [];
        if (storedMessages.length === 0) {
          throw new Error("Compaction returned empty session");
        }

        const compactedMessages = mapStoredMessages(storedMessages);

        updateSessions((sessions) => {
          if (sessions.some((existing) => existing.id === compactedSession.id)) {
            return sessions.map((existing) =>
              existing.id === compactedSession.id ? compactedSession : existing,
            );
          }
          return [compactedSession, ...sessions];
        });

        setCurrentSessionId(compactedSession.id);
        setCurrentSessionTitle(compactedSession.title || compactedTitle);
        sessionIdRef.current = compactedSession.id;
        setMessages(compactedMessages);
        hydrateAgentState(compactedSession);
        void loadAgentFiles({ sessionId: compactedSession.id });

        const afterTokens = calculateMessageTokens(
          compactedMessages.map((message) => ({
            role: message.role,
            content: buildContextContent(message),
          })),
        );

        setCompactionHistory((prev) => [
          ...prev,
          {
            id: `compact-${Date.now()}`,
            timestamp: new Date(),
            beforeTokens,
            afterTokens,
            messagesRemoved: Math.max(0, messages.length - compactedMessages.length),
            messagesKept: compactedMessages.length,
            maxContext,
            utilizationBefore: beforeTokens / maxContext,
            utilizationAfter: afterTokens / maxContext,
            strategy: "summarize",
            summary: result.summary as string,
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Compaction failed";
        console.error(message);
        setCompactionError(message);
      } finally {
        setCompacting(false);
      }
    },
    [
      buildContextContent,
      calculateMessageTokens,
      compacting,
      contextConfig.compactionThreshold,
      contextMessages,
      contextStats,
      currentSessionId,
      currentSessionTitle,
      hydrateAgentState,
      isLoading,
      loadAgentFiles,
      mapStoredMessages,
      maxContext,
      messages,
      requestCompaction,
      selectedModel,
      sessionIdRef,
      setCurrentSessionId,
      setCurrentSessionTitle,
      setMessages,
      updateSessions,
    ],
  );

  const runAutoCompaction = useCallback(async () => {
    if (!contextConfig.autoCompact) return;
    await performCompaction({ reason: "auto", requireThreshold: true });
  }, [contextConfig.autoCompact, performCompaction]);

  const runManualCompaction = useCallback(async () => {
    await performCompaction({ reason: "manual", requireThreshold: false });
  }, [performCompaction]);

  useEffect(() => {
    lastCompactionSignatureRef.current = null;
    setCompactionError(null);
    setCompactionHistory([]);
    clearArtifactsCache();
  }, [clearArtifactsCache, currentSessionId]);

  // Auto-compaction effect: only check when streaming stops (not during streaming).
  const compactionAttemptedRef = useRef(false);
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }

    if (!wasLoadingRef.current) return;
    wasLoadingRef.current = false;

    if (compactionAttemptedRef.current) return;
    if (!contextStats || !maxContext) return;
    if (!contextConfig.autoCompact) return;
    if (compacting) return;
    if (contextStats.utilization < contextConfig.compactionThreshold) return;
    if (!selectedModel || messages.length < 2) return;
    if (!currentSessionId) return;

    const signature = `${currentSessionId}-${messages.length}-${contextStats.currentTokens}`;
    if (lastCompactionSignatureRef.current === signature) return;

    lastCompactionSignatureRef.current = signature;
    compactionAttemptedRef.current = true;

    void runAutoCompaction();

    return () => {
      compactionAttemptedRef.current = false;
    };
  }, [
    compacting,
    contextConfig.autoCompact,
    contextConfig.compactionThreshold,
    contextStats,
    currentSessionId,
    isLoading,
    maxContext,
    messages.length,
    runAutoCompaction,
    selectedModel,
  ]);

  const canManualCompact =
    Boolean(currentSessionId) &&
    Boolean(selectedModel) &&
    messages.length > 1 &&
    !compacting &&
    !isLoading;

  return { compactionHistory, compacting, compactionError, runManualCompaction, canManualCompact };
}
