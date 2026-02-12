// CRITICAL
"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as Hooks from "@/app/chat/hooks";
import { useChatTitleGenerator } from "./use-chat-title-generator";
import type { ChatMessage, ChatSession, ToolResult } from "@/lib/types";
import type { AgentPlan } from "@/app/chat/_components/agent/agent-types";

export interface UseChatPageServicesArgs {
  store: {
    mcpEnabled: boolean;
    selectedModel: string;
    updateSessions: (updater: (sessions: ChatSession[]) => ChatSession[]) => void;
    setAgentPlan: (next: AgentPlan | null) => void;
    updateToolResultsMap: (
      updater: (toolResultsMap: Map<string, ToolResult>) => Map<string, ToolResult>,
    ) => void;
    updateExecutingTools: (updater: (executingTools: Set<string>) => Set<string>) => void;
  };
  setMessages: (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;

  activeRunIdRef: MutableRefObject<string | null>;
  lastEventTimeRef: MutableRefObject<number>;
  runCompletedRef: MutableRefObject<boolean>;

  lastUserInputRef: MutableRefObject<string>;
  lastAssistantContentRef: MutableRefObject<string>;

  setStreamStalled: (next: boolean) => void;
  setIsLoading: (next: boolean) => void;
  setStreamError: (next: string | null) => void;
}

export function useChatPageServices({
  store,
  setMessages,
  activeRunIdRef,
  lastEventTimeRef,
  runCompletedRef,
  lastUserInputRef,
  lastAssistantContentRef,
  setStreamStalled,
  setIsLoading,
  setStreamError,
}: UseChatPageServicesArgs) {
  const agentFiles = Hooks.useAgentFiles();
  const agentState = Hooks.useAgentState();
  const sessions = Hooks.useChatSessions();
  const tools = Hooks.useChatTools({ mcpEnabled: store.mcpEnabled });
  const usage = Hooks.useChatUsage();

  const sessionIdRef = useRef<string | null>(sessions.currentSessionId);
  useEffect(() => {
    sessionIdRef.current = sessions.currentSessionId;
  }, [sessions.currentSessionId]);

  const messageMapping = Hooks.useChatMessageMapping({ setMessages });
  const toolResults = Hooks.useChatToolResults({
    setMessages,
    isToolPart: messageMapping.isToolPart,
    updateToolResultsMap: store.updateToolResultsMap,
  });

  const generateTitle = useChatTitleGenerator({
    selectedModel: store.selectedModel || "",
    setCurrentSessionTitle: sessions.setCurrentSessionTitle,
    updateSessions: store.updateSessions,
  });

  const handleRunEvent = Hooks.useRunEventHandler({
    currentSessionId: sessions.currentSessionId,
    currentSessionTitle: sessions.currentSessionTitle,
    activeRunIdRef,
    lastEventTimeRef,
    runCompletedRef,
    lastUserInputRef,
    lastAssistantContentRef,
    setStreamStalled,
    setIsLoading,
    setStreamError,
    setAgentPlan: store.setAgentPlan,
    generateTitle,
    extractToolResultText: toolResults.extractToolResultText,
    recordToolResult: toolResults.recordToolResult,
    updateExecutingTools: store.updateExecutingTools,
    mapAgentMessageToChatMessage: messageMapping.mapAgentMessageToChatMessage,
    upsertMessage: messageMapping.upsertMessage,
    loadAgentFiles: agentFiles.loadAgentFiles,
    readAgentFile: agentFiles.readAgentFile,
    moveAgentFileVersions: agentFiles.moveAgentFileVersions,
  });

  return {
    agentFiles,
    agentState,
    sessions,
    tools,
    usage,
    sessionIdRef,
    messageMapping,
    toolResults,
    generateTitle,
    handleRunEvent,
  };
}
