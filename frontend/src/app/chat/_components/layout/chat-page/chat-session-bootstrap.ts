// CRITICAL
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ChatMessage, ChatSessionDetail, StoredMessage, ToolResult } from "@/lib/types";

export interface UseChatSessionBootstrapArgs {
  newChatFromUrl: boolean;
  sessionFromUrl: string | null;
  currentSessionId: string | null;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  loadSessions: () => void;
  loadSession: (sessionId: string) => Promise<ChatSessionDetail | null>;
  startNewSession: () => void;
  router: { replace: (href: string) => void };
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  mapStoredMessages: (messages: StoredMessage[]) => ChatMessage[];
  hydrateAgentState: (session: ChatSessionDetail) => void;
  loadAgentFiles: (args: { sessionId: string }) => void;
  clearPlan: () => void;
  clearAgentFiles: () => void;
  setExecutingTools: (value: Set<string>) => void;
  setToolResultsMap: (value: Map<string, ToolResult>) => void;
  resetCompaction: () => void;
  getMessagesLength: () => number;
  sessionIdRef: MutableRefObject<string | null>;
  activeRunIdRef: MutableRefObject<string | null>;
  runAbortControllerRef: MutableRefObject<AbortController | null>;
  getLastSessionId: () => string | null;
  setLastSessionId: (sessionId: string) => void;
  /** When set, ignore `session` query for restore until URL/sync catches up (avoids stale `useSearchParams`). */
  sessionUrlSyncSuppressedRef?: MutableRefObject<boolean>;
}

export function resolveNewChatResetGate({
  newChatFromUrl,
  hasHandledNewChatReset,
}: {
  newChatFromUrl: boolean;
  hasHandledNewChatReset: boolean;
}) {
  if (!newChatFromUrl) {
    return { shouldReset: false, hasHandledNewChatReset: false };
  }
  if (hasHandledNewChatReset) {
    return { shouldReset: false, hasHandledNewChatReset: true };
  }
  return { shouldReset: true, hasHandledNewChatReset: true };
}

export function useChatSessionBootstrap({
  newChatFromUrl,
  sessionFromUrl,
  currentSessionId,
  selectedModel,
  setSelectedModel,
  loadSessions,
  loadSession,
  startNewSession,
  router,
  setMessages,
  mapStoredMessages,
  hydrateAgentState,
  loadAgentFiles,
  clearPlan,
  clearAgentFiles,
  setExecutingTools,
  setToolResultsMap,
  resetCompaction,
  getMessagesLength,
  sessionIdRef,
  activeRunIdRef,
  runAbortControllerRef,
  getLastSessionId,
  setLastSessionId,
  sessionUrlSyncSuppressedRef,
}: UseChatSessionBootstrapArgs) {
  const clearActiveRun = useCallback((snapshotController?: AbortController | null) => {
    const controller = snapshotController !== undefined ? snapshotController : runAbortControllerRef.current;
    if (controller && controller === runAbortControllerRef.current) {
      controller.abort();
      runAbortControllerRef.current = null;
    }
    activeRunIdRef.current = null;
  }, [activeRunIdRef, runAbortControllerRef]);

  const handledNewChatResetRef = useRef(false);
  // Tracks the URL state this effect last processed. We use this as a guard so
  // the effect only drives session loading when the URL actually changed —
  // otherwise, unrelated dep changes (callback identity churn from clicking
  // the sidebar) can cause it to re-fire with a stale `sessionFromUrl` and
  // snap state back to the previous session.
  const lastHandledUrlKeyRef = useRef<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Remember the active session (URL-based navigation will update this too)
  useEffect(() => {
    if (currentSessionId) {
      setLastSessionId(currentSessionId);
    }
  }, [currentSessionId, setLastSessionId]);

  // Handle PWA resume - reload session when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      // Reload current session to restore messages after PWA was backgrounded
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      void (async () => {
        try {
          const session = await loadSession(sessionId);
          if (!session) return;
          const storedMessages = session.messages ?? [];
          // Only restore if we lost messages (PWA was killed)
          if (getMessagesLength() === 0 && storedMessages.length > 0) {
            setMessages(mapStoredMessages(storedMessages));
          }
          hydrateAgentState(session);
          void loadAgentFiles({ sessionId: session.id });
        } catch (err) {
          console.error("Failed to restore session on resume:", err);
        }
      })();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    hydrateAgentState,
    loadAgentFiles,
    loadSession,
    mapStoredMessages,
    getMessagesLength,
    sessionIdRef,
    setMessages,
  ]);

  // Handle URL session/new params and restore last session if needed
  useEffect(() => {
    // Only run when the URL actually changed. Other deps (callbacks whose
    // identity churns when session state changes) can re-trigger this effect
    // mid-click; acting on a stale `sessionFromUrl` would revert state back to
    // the previous session.
    const urlKey = `${newChatFromUrl ? "1" : "0"}:${sessionFromUrl ?? ""}`;
    if (lastHandledUrlKeyRef.current === urlKey) return;
    lastHandledUrlKeyRef.current = urlKey;

    // Snapshot the abort controller at the start of this effect so we only
    // abort the run that was active when the effect was scheduled, not a
    // new run that may have started between render and effect execution.
    const controllerSnapshot = runAbortControllerRef.current;

    const gate = resolveNewChatResetGate({
      newChatFromUrl,
      hasHandledNewChatReset: handledNewChatResetRef.current,
    });
    handledNewChatResetRef.current = gate.hasHandledNewChatReset;

    if (gate.shouldReset) {
      if (sessionUrlSyncSuppressedRef) {
        sessionUrlSyncSuppressedRef.current = true;
      }
      startNewSession();
      setLastSessionId("");
      clearActiveRun(controllerSnapshot);
      setExecutingTools(new Set());
      setToolResultsMap(new Map());
      clearPlan();
      clearAgentFiles();
      resetCompaction();
      return;
    }
    if (newChatFromUrl) return;

    const effectiveSessionFromUrl =
      sessionUrlSyncSuppressedRef?.current ? null : sessionFromUrl;
    const targetSessionId = effectiveSessionFromUrl || getLastSessionId();
    if (!targetSessionId) return;

    // Avoid re-loading the same session repeatedly. Read the live id via ref
    // so this effect only reacts to URL changes — not to state changes driven
    // by sidebar clicks (which would race with the tail's URL-sync effect and
    // cause sessions to flip-flop during click-through).
    if (targetSessionId === sessionIdRef.current) return;

    // Only abort active runs and clear transient tool state; defer clearing messages
    // until the new session has loaded to avoid a flash of empty content.
    clearActiveRun(controllerSnapshot);
    setExecutingTools(new Set());
    setToolResultsMap(new Map());
    resetCompaction();

    // If the URL is missing session but we have a remembered one, reflect it in the URL
    if (!effectiveSessionFromUrl) {
      router.replace(`/chat?session=${encodeURIComponent(targetSessionId)}`);
    }

    void (async () => {
      const session = await loadSession(targetSessionId);
      if (!session) {
        // Stale session ID in URL or localStorage: reset to new chat.
        setLastSessionId("");
        startNewSession();
        clearPlan();
        clearAgentFiles();
        resetCompaction();
        if (sessionFromUrl) {
          router.replace("/chat?new=1");
        }
        return;
      }

      if (session.model && session.model !== selectedModel) {
        setSelectedModel(session.model);
      }
      const stored = session.messages ?? [];
      setMessages(mapStoredMessages(stored));
      hydrateAgentState(session);
      clearAgentFiles();
      void loadAgentFiles({ sessionId: session.id });
    })();
  }, [
    clearActiveRun,
    clearAgentFiles,
    clearPlan,
    getLastSessionId,
    hydrateAgentState,
    loadAgentFiles,
    loadSession,
    mapStoredMessages,
    newChatFromUrl,
    resetCompaction,
    router,
    runAbortControllerRef,
    selectedModel,
    sessionFromUrl,
    sessionIdRef,
    sessionUrlSyncSuppressedRef,
    setExecutingTools,
    setLastSessionId,
    setMessages,
    setSelectedModel,
    setToolResultsMap,
    startNewSession,
  ]);
}
