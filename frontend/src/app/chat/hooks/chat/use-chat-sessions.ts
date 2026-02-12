// CRITICAL
"use client";

import { useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";

export function useChatSessions() {
  const {
    sessions,
    currentSessionId,
    currentSessionTitle,
    sessionsLoading,
    setSessions,
    updateSessions,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setSessionsLoading,
  } = useAppStore(
    useShallow((state) => ({
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
      currentSessionTitle: state.currentSessionTitle,
      sessionsLoading: state.sessionsLoading,
      setSessions: state.setSessions,
      updateSessions: state.updateSessions,
      setCurrentSessionId: state.setCurrentSessionId,
      setCurrentSessionTitle: state.setCurrentSessionTitle,
      setSessionsLoading: state.setSessionsLoading,
    })),
  );
  const activeSessionRef = useRef<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await api.getChatSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [setSessions, setSessionsLoading]);

  const startNewSession = useCallback(() => {
    activeSessionRef.current = null;
    setCurrentSessionId(null);
    setCurrentSessionTitle("New Chat");
  }, [setCurrentSessionId, setCurrentSessionTitle]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      if (activeSessionRef.current === sessionId && currentSessionId === sessionId) return;
      activeSessionRef.current = sessionId;

      try {
        const data = await api.getChatSession(sessionId);
        setCurrentSessionId(sessionId);
        setCurrentSessionTitle(data.session?.title || "Chat");
        // Messages are managed by ChatPage state; we just load metadata here.
        return data.session ?? null;
      } catch (err) {
        console.error("Failed to load session:", err);
        // Remove stale IDs from the local list so navigation doesn't appear "stuck".
        updateSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          startNewSession();
        }
        return null;
      }
    },
    [currentSessionId, setCurrentSessionId, setCurrentSessionTitle, startNewSession, updateSessions],
  );

  const createSession = useCallback(
    async (title: string, model?: string) => {
      try {
        const { session } = await api.createChatSession({
          title,
          model,
        });
        updateSessions((prev) => {
          if (prev.some((existing) => existing.id === session.id)) {
            return prev.map((existing) => (existing.id === session.id ? session : existing));
          }
          return [session, ...prev];
        });
        setCurrentSessionId(session.id);
        setCurrentSessionTitle(session.title);
        activeSessionRef.current = session.id;
        return session;
      } catch (err) {
        console.error("Failed to create session:", err);
        return null;
      }
    },
    [setCurrentSessionId, setCurrentSessionTitle, updateSessions],
  );

  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        await api.updateChatSession(sessionId, { title });
        updateSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
        if (currentSessionId === sessionId) {
          setCurrentSessionTitle(title);
        }
      } catch (err) {
        console.error("Failed to update session title:", err);
      }
    },
    [currentSessionId, setCurrentSessionTitle, updateSessions],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await api.deleteChatSession(sessionId);
        updateSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          startNewSession();
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [currentSessionId, startNewSession, updateSessions],
  );

  return {
    sessions,
    currentSessionId,
    currentSessionTitle,
    sessionsLoading,
    loadSessions,
    loadSession,
    startNewSession,
    createSession,
    updateSessionTitle,
    deleteSession,
    setCurrentSessionId,
    setCurrentSessionTitle,
  };
}
