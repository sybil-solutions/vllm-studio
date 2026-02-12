// CRITICAL
"use client";

import { useCallback } from "react";
import type { ChatPageViewProps } from "../../view/chat-page-view/types";
import { buildChatPageViewProps } from "./build-chat-page-view-props";
import { useChatExportActions } from "./actions/use-chat-export-actions";
import { useChatRunActions } from "./actions/use-chat-run-actions";
import { useChatUiActions } from "./actions/use-chat-ui-actions";
import { setLastSessionId as setLastSessionIdStorage } from "../last-session-id";
import type { UseChatPageControllerTailArgs } from "./types/use-chat-page-controller-tail";

export function useChatPageControllerTail({
  store,
  sessions,
  tools,
  agentFiles,
  router,
  sessionFromUrl,
  sidebarOpen,
  setSidebarOpen,
  sidebarTab,
  setSidebarTab,
  messages,
  setMessages,
  isLoading,
  streamError,
  streamStalled,
  setStreamError,
  setIsLoading,
  setStreamStalled,
  clearPlan,
  lastUserInputRef,
  generateTitle,
  handleRunEvent,
  activeRunIdRef,
  runAbortControllerRef,
  runCompletedRef,
  lastEventTimeRef,
  sessionIdRef,
  activityPanelVisible,
  thinkingActive,
  activityGroups,
  activityCount,
  thinkingSnippet,
  executingToolsSize,
  contextStats,
  contextBreakdown,
  contextUsageLabel,
  compactionHistory,
  compacting,
  compactionError,
  formatTokenCount,
  runManualCompaction,
  canManualCompact,
  sessionArtifacts,
  artifactsByMessage,
  activeArtifact,
  handleScroll,
  messagesContainerRef,
  messagesEndRef,
}: UseChatPageControllerTailArgs): ChatPageViewProps {

  const hasSession = Boolean(sessionFromUrl || sessions.currentSessionId);
  const showEmptyState = messages.length === 0 && !isLoading && !streamError;

  const replaceUrlToSession = useCallback(
    (sessionId: string) => {
      router.replace(`/chat?session=${encodeURIComponent(sessionId)}`);
    },
    [router],
  );

  const { onExportJson, onExportMarkdown } = useChatExportActions({
    currentSessionId: sessions.currentSessionId,
    currentSessionTitle: sessions.currentSessionTitle,
    selectedModel: store.selectedModel,
    messages,
  });

  const { handleSend, handleReprompt, handleForkMessage, handleStop } = useChatRunActions({
    store,
    sessions,
    agentFiles,
    isLoading,
    setMessages,
    setStreamError,
    lastUserInputRef,
    replaceUrlToSession,
    generateTitle,
    setLastSessionId: setLastSessionIdStorage,
    activeRunIdRef,
    runAbortControllerRef,
    runCompletedRef,
    lastEventTimeRef,
    sessionIdRef,
    setIsLoading,
    setStreamStalled,
    setExecutingTools: store.setExecutingTools,
    setToolResultsMap: store.setToolResultsMap,
    handleRunEvent,
    router,
  });

  const {
    toolBelt,
    handleSetSidebarTab,
    openActivityPanel,
    openContextPanel,
    handleOpenAgentFile,
    handleSelectAgentFile,
  } = useChatUiActions({
    store,
    sessions,
    agentFiles,
    isLoading,
    thinkingSnippet,
    clearPlan,
    onSubmit: handleSend,
    onStop: handleStop,
    sidebarOpen,
    setSidebarOpen,
    setSidebarTab,
    sessionFromUrl,
    activityPanelVisible,
    thinkingActive,
    executingToolsSize,
    activityGroupsLength: activityGroups.length,
  });

  const onReprompt = useCallback(
    async (messageId: string) => {
      await handleReprompt(messageId, messages);
    },
    [handleReprompt, messages],
  );

  const handleCloseArtifactModal = () => {
    store.setActiveArtifactId(null);
  };

  return buildChatPageViewProps({
    store,
    ui: {
      sidebarOpen,
      setSidebarOpen,
      sidebarTab,
      setSidebarTab: handleSetSidebarTab,
      handleScroll,
      messagesContainerRef,
      messagesEndRef,
      toolBelt,
    },
    derived: {
      activityGroups,
      activityCount,
      thinkingActive,
      isLoading,
      streamError,
      streamStalled,
      thinkingSnippet,
      showEmptyState,
    },
    context: {
      contextStats,
      contextBreakdown,
      contextUsageLabel,
      compactionHistory,
      compacting,
      compactionError,
      formatTokenCount,
      runManualCompaction,
      canManualCompact,
    },
    artifacts: {
      sessionArtifacts,
      artifactsByMessage,
      activeArtifact,
      onCloseArtifactModal: handleCloseArtifactModal,
    },
    agentFiles: {
      agentFiles: agentFiles.agentFiles,
      agentFileVersions: agentFiles.agentFileVersions,
      selectedAgentFilePath: agentFiles.selectedAgentFilePath,
      selectedAgentFileContent: agentFiles.selectedAgentFileContent,
      selectedAgentFileLoading: agentFiles.selectedAgentFileLoading,
      onSelectAgentFile: handleSelectAgentFile,
      onOpenAgentFile: handleOpenAgentFile,
    },
    chat: {
      hasSession,
      messages,
      onForkMessage: handleForkMessage,
      onReprompt,
      openActivityPanel,
      openContextPanel,
    },
    mcp: {
      mcpServers: tools.mcpServers,
      addMcpServer: tools.addMcpServer,
      updateMcpServer: tools.updateMcpServer,
      removeMcpServer: tools.removeMcpServer,
      loadMCPServers: tools.loadMCPServers,
    },
    exportActions: { onExportJson, onExportMarkdown },
  });
}
