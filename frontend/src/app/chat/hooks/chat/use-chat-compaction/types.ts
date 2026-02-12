// CRITICAL
"use client";

import type { MutableRefObject } from "react";
import type { CompactionEvent } from "@/lib/services/context-management";
import type { ChatMessage, ChatSessionDetail, StoredMessage } from "@/lib/types";

export type ContextStats = {
  currentTokens: number;
  utilization: number;
};

export type ContextMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ContextConfig = {
  autoCompact: boolean;
  compactionThreshold: number;
};

export type UseChatCompactionArgs = {
  currentSessionId: string | null;
  currentSessionTitle: string;
  selectedModel: string | null;
  effectiveSystemPrompt: string;

  messages: ChatMessage[];
  isLoading: boolean;
  maxContext: number | undefined;
  contextStats: ContextStats | null;
  contextConfig: ContextConfig;
  contextMessages: ContextMessage[];

  calculateMessageTokens: (messages: ContextMessage[]) => number;
  mapStoredMessages: (storedMessages: StoredMessage[]) => ChatMessage[];
  buildContextContent: (message: ChatMessage) => string;

  updateSessions: (updater: (sessions: ChatSessionDetail[]) => ChatSessionDetail[]) => void;
  setCurrentSessionId: (value: string | null) => void;
  setCurrentSessionTitle: (value: string) => void;
  setMessages: (messages: ChatMessage[]) => void;

  hydrateAgentState: (session: ChatSessionDetail) => void;
  loadAgentFiles: (options: { sessionId: string }) => Promise<unknown>;
  sessionIdRef: MutableRefObject<string | null>;

  clearArtifactsCache: () => void;
};

export type UseChatCompactionResult = {
  compactionHistory: CompactionEvent[];
  compacting: boolean;
  compactionError: string | null;
  runManualCompaction: () => Promise<void>;
  canManualCompact: boolean;
};

