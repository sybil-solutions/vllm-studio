"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { ChatSession } from "@/lib/types";

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>("New Chat");
  const [sessionsLoading, setSessionsLoading] = useState(false);
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
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    if (activeSessionRef.current === sessionId) return;
    activeSessionRef.current = sessionId;

    try {
      const data = await api.getChatSession(sessionId);
      setCurrentSessionId(sessionId);
      setCurrentSessionTitle(data.session?.title || "Chat");
      // Messages are managed by useChat, we just load metadata
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  const startNewSession = useCallback(() => {
    activeSessionRef.current = null;
    setCurrentSessionId(null);
    setCurrentSessionTitle("New Chat");
  }, []);

  const createSession = useCallback(async (title: string, model?: string) => {
    try {
      const { session } = await api.createChatSession({
        title,
        model,
      });
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session.id);
      setCurrentSessionTitle(session.title);
      activeSessionRef.current = session.id;
      return session;
    } catch (err) {
      console.error("Failed to create session:", err);
      return null;
    }
  }, []);

  const updateSessionTitle = useCallback(
    async (sessionId: string, title: string) => {
      try {
        await api.updateChatSession(sessionId, { title });
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title } : s)));
        if (currentSessionId === sessionId) {
          setCurrentSessionTitle(title);
        }
      } catch (err) {
        console.error("Failed to update session title:", err);
      }
    },
    [currentSessionId],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await api.deleteChatSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          startNewSession();
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [currentSessionId, startNewSession],
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
