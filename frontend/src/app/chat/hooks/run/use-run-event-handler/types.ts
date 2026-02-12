// CRITICAL
"use client";

import type { MutableRefObject } from "react";
import type { ChatRunStreamEvent } from "@/lib/api";
import type { AgentPlan, ChatMessage } from "@/lib/types";

export type RunMeta = { runId?: string; turnIndex?: number } | undefined;

export type UseRunEventHandlerArgs = {
  currentSessionId: string | null;
  currentSessionTitle: string;

  activeRunIdRef: MutableRefObject<string | null>;
  lastEventTimeRef: MutableRefObject<number>;
  runCompletedRef: MutableRefObject<boolean>;
  lastUserInputRef: MutableRefObject<string>;
  lastAssistantContentRef: MutableRefObject<string>;

  setStreamStalled: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setStreamError: (value: string | null) => void;
  setAgentPlan: (value: AgentPlan | null) => void;

  generateTitle: (sessionId: string, userContent: string, assistantContent: string) => Promise<string | null>;

  extractToolResultText: (input: unknown) => string;
  recordToolResult: (toolCallId: string, resultText: string, isError: boolean) => void;
  updateExecutingTools: (updater: (executingTools: Set<string>) => Set<string>) => void;

  mapAgentMessageToChatMessage: (
    rawMessage: Record<string, unknown>,
    messageId: string | undefined,
    runMeta: RunMeta,
  ) => ChatMessage | null;
  upsertMessage: (message: ChatMessage) => void;

  loadAgentFiles: (options: { sessionId: string }) => Promise<unknown>;
  readAgentFile: (path: string, sessionIdOverride?: string | null) => Promise<unknown>;
  moveAgentFileVersions: (from: string, to: string) => void;
};

export type RunEventHandler = (event: ChatRunStreamEvent) => void;

