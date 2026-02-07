// CRITICAL
"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import api from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { useAppStore } from "@/store";
import { ToolBelt } from "../../input/tool-belt";
import { AgentPlanDrawer } from "../../agent/agent-plan-drawer";
import * as Hooks from "../../../hooks";
import type { Attachment } from "../../../types";
import type { SidebarTab } from "../unified-sidebar";
import { buildAgentModeSystemPrompt } from "../../../utils/agent-system-prompt";
import { exportChatAsJson, exportChatAsMarkdown } from "./chat-export";
import { useChatRunStream } from "./chat-run-stream";
import { useChatSendUserMessage } from "./chat-send-user-message";
import { getLastSessionId, setLastSessionId } from "./last-session-id";
import { useChatSessionBootstrap } from "./chat-session-bootstrap";
import { useChatSidebarController } from "./chat-sidebar-controller";
import type { ChatPageViewProps } from "./chat-page-view";
import { useChatPageEvents } from "./use-chat-page-events";
import { useChatPageTimers } from "./use-chat-page-timers";

export function useChatPageController(): ChatPageViewProps {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionFromUrl = searchParams.get("session");
  const newChatFromUrl = searchParams.get("new") === "1";

  const {
    setInput,
    selectedModel,
    setSelectedModel,
    systemPrompt,
    setSystemPrompt,
    mcpEnabled,
    setMcpEnabled,
    artifactsEnabled,
    setArtifactsEnabled,
    activeArtifactId,
    setActiveArtifactId,
    deepResearch,
    setDeepResearch,
    elapsedSeconds,
    setElapsedSeconds,
    streamingStartTime,
    setStreamingStartTime,

    settingsOpen,
    setSettingsOpen,
    mcpSettingsOpen,
    setMcpSettingsOpen,
    usageOpen,
    setUsageOpen,
    exportOpen,
    setExportOpen,
    availableModels,
    setAvailableModels,
    sessionUsage,
    setExecutingTools,
    updateExecutingTools,
    setToolResultsMap,
    updateToolResultsMap,

    agentMode,
    setAgentMode,
    agentPlan,
    setAgentPlan,

    sidebarWidth,
    setSidebarWidth,

    updateSessions,
  } = useAppStore(
    useShallow((state) => ({
      setInput: state.setInput,
      selectedModel: state.selectedModel,
      setSelectedModel: state.setSelectedModel,
      systemPrompt: state.systemPrompt,
      setSystemPrompt: state.setSystemPrompt,
      mcpEnabled: state.mcpEnabled,
      setMcpEnabled: state.setMcpEnabled,
      artifactsEnabled: state.artifactsEnabled,
      setArtifactsEnabled: state.setArtifactsEnabled,
      activeArtifactId: state.activeArtifactId,
      setActiveArtifactId: state.setActiveArtifactId,
      deepResearch: state.deepResearch,
      setDeepResearch: state.setDeepResearch,
      elapsedSeconds: state.elapsedSeconds,
      setElapsedSeconds: state.setElapsedSeconds,
      streamingStartTime: state.streamingStartTime,
      setStreamingStartTime: state.setStreamingStartTime,

      settingsOpen: state.chatSettingsOpen,
      setSettingsOpen: state.setChatSettingsOpen,
      mcpSettingsOpen: state.mcpSettingsOpen,
      setMcpSettingsOpen: state.setMcpSettingsOpen,
      usageOpen: state.usageDetailsOpen,
      setUsageOpen: state.setUsageDetailsOpen,
      exportOpen: state.exportOpen,
      setExportOpen: state.setExportOpen,
      availableModels: state.availableModels,
      setAvailableModels: state.setAvailableModels,
      sessionUsage: state.sessionUsage,
      setExecutingTools: state.setExecutingTools,
      updateExecutingTools: state.updateExecutingTools,
      setToolResultsMap: state.setToolResultsMap,
      updateToolResultsMap: state.updateToolResultsMap,

      agentMode: state.agentMode,
      setAgentMode: state.setAgentMode,
      agentPlan: state.agentPlan,
      setAgentPlan: state.setAgentPlan,

      sidebarWidth: state.sidebarWidth,
      setSidebarWidth: state.setSidebarWidth,

      updateSessions: state.updateSessions,
    })),
  );

  const mobilePlanChipHidden = useAppStore((state) => state.mobilePlanChipHidden);
  const setMobilePlanChipHidden = useAppStore((state) => state.setMobilePlanChipHidden);

  // Ensure agent mode is enabled (agent-first UX).
  useEffect(() => {
    if (!agentMode) setAgentMode(true);
  }, [agentMode, setAgentMode]);

  const {
    agentFiles,
    agentFileVersions,
    loadAgentFiles,
    readAgentFile,
    clearAgentFiles,
    selectedAgentFilePath,
    selectedAgentFileContent,
    selectedAgentFileLoading,
    selectAgentFile,
    moveAgentFileVersions,
  } = Hooks.useAgentFiles();

  const { hydrateAgentState, persistAgentState, buildAgentState } = Hooks.useAgentState();

  const effectiveSystemPrompt = useMemo(() => {
    const base = systemPrompt.trim();
    if (!agentMode) return base;
    const agentBlock = buildAgentModeSystemPrompt(agentPlan);
    return base ? `${base}\n\n${agentBlock}` : agentBlock;
  }, [systemPrompt, agentMode, agentPlan]);

  // Refs
  const messagesLengthRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamStalled, setStreamStalled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("activity");
  const resultsLastTab = useAppStore((state) => state.resultsLastTab);
  const setResultsLastTab = useAppStore((state) => state.setResultsLastTab);
  const activeRunIdRef = useRef<string | null>(null);
  const runAbortControllerRef = useRef<AbortController | null>(null);
  const runCompletedRef = useRef(false);
  const lastEventTimeRef = useRef<number>(0);

  // Sessions hook
  const {
    currentSessionId,
    currentSessionTitle,
    loadSessions,
    loadSession,
    startNewSession,
    createSession,
    setCurrentSessionId,
    setCurrentSessionTitle,
  } = Hooks.useChatSessions();

  // Tools hook
  const {
    mcpServers,
    loadMCPServers,
    loadMCPTools,
    getToolDefinitions,
    executingTools,
    toolResultsMap,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
  } = Hooks.useChatTools({ mcpEnabled });

  // Usage hook
  const { refreshUsage } = Hooks.useChatUsage();

  const sessionIdRef = useRef<string | null>(currentSessionId);
  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Track the last user input for title generation
  const lastUserInputRef = useRef<string>("");
  const lastAssistantContentRef = useRef<string>("");

  const { mapStoredMessages, mapAgentMessageToChatMessage, upsertMessage, isToolPart } =
    Hooks.useChatMessageMapping({ setMessages });

  const { extractToolResultText, recordToolResult } = Hooks.useChatToolResults({
    setMessages,
    isToolPart,
    updateToolResultsMap,
  });

  const generateTitle = useCallback(
    async (sessionId: string, userContent: string, assistantContent: string) => {
      try {
        const res = await fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            user: userContent,
            assistant: assistantContent,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.title && data.title !== "New Chat") {
            await api.updateChatSession(sessionId, { title: data.title });
            setCurrentSessionTitle(data.title);
            updateSessions((sessions) =>
              sessions.map((session) =>
                session.id === sessionId ? { ...session, title: data.title } : session,
              ),
            );
            return data.title;
          }
        }
      } catch (err) {
        console.error("Failed to generate title:", err);
      }
      return null;
    },
    [selectedModel, setCurrentSessionTitle, updateSessions],
  );

  const handleRunEvent = Hooks.useRunEventHandler({
    currentSessionId,
    currentSessionTitle,
    activeRunIdRef,
    lastEventTimeRef,
    runCompletedRef,
    lastUserInputRef,
    lastAssistantContentRef,
    setStreamStalled,
    setIsLoading,
    setStreamError,
    setAgentPlan,
    generateTitle,
    extractToolResultText,
    recordToolResult,
    updateExecutingTools,
    mapAgentMessageToChatMessage,
    upsertMessage,
    loadAgentFiles,
    readAgentFile,
    moveAgentFileVersions,
  });

  const clearPlan = useCallback(() => {
    setAgentPlan(null);
    if (currentSessionId) {
      void persistAgentState(currentSessionId, buildAgentState(null));
    }
  }, [buildAgentState, currentSessionId, persistAgentState, setAgentPlan]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useChatPageEvents({
    currentSessionId,
    hydrateAgentState,
    mapStoredMessages,
    startNewSession,
    messagesRef,
    setMessages,
  });

  // Derived state from messages
  const activityPanelVisible = sidebarOpen && sidebarTab === "activity";
  const contextPanelVisible = sidebarOpen && sidebarTab === "context";

  const { thinkingActive, thinkingState, activityGroups } = Hooks.useChatDerived({
    messages,
    isLoading,
    executingTools,
    toolResultsMap,
    enableActivityGroups: activityPanelVisible,
  });

  const activityCount = useMemo(() => {
    if (activityPanelVisible) {
      return activityGroups.reduce((sum, group) => sum + group.items.length, 0);
    }
    if (executingTools.size > 0) return executingTools.size;
    return isLoading ? 1 : 0;
  }, [activityGroups, activityPanelVisible, executingTools.size, isLoading]);

  const thinkingSnippet = useMemo(() => {
    const MAX_SNIPPET_CHARS = 120;
    if (!isLoading) return "";
    if (streamStalled && executingTools.size === 0) {
      const seconds = Math.max(0, elapsedSeconds);
      const mm = Math.floor(seconds / 60);
      const ss = (seconds % 60).toString().padStart(2, "0");
      return `Still working... (quiet for ${mm}:${ss})`;
    }
    const raw = thinkingState.content.trim();
    if (raw) {
      const line =
        raw.split(/\r?\n/).find((entry) => entry.trim().length > 0) ?? raw;
      const trimmed = line.trim();
      return trimmed.length > MAX_SNIPPET_CHARS
        ? `${trimmed.slice(0, MAX_SNIPPET_CHARS).trim()}...`
        : trimmed;
    }
    if (executingTools.size > 0) {
      const toolIds = Array.from(executingTools);

      const resolveToolName = (toolCallId: string) => {
        const result = toolResultsMap.get(toolCallId);
        if (result?.name && result.name.trim()) return result.name.trim();

        // Fallback to the most recent tool part name for this tool call id.
        for (let i = messages.length - 1; i >= 0; i -= 1) {
          const msg = messages[i];
          if (msg.role !== "assistant") continue;
          for (const part of msg.parts ?? []) {
            if (!part || typeof part !== "object") continue;
            const toolPart = part as { toolCallId?: unknown; toolName?: unknown };
            if (toolPart.toolCallId !== toolCallId) continue;
            if (typeof toolPart.toolName === "string" && toolPart.toolName.trim()) {
              return toolPart.toolName.trim();
            }
          }
        }
        return toolCallId;
      };

      const counts = new Map<string, number>();
      const orderedNames: string[] = [];
      for (const toolCallId of toolIds) {
        const name = resolveToolName(toolCallId);
        const next = (counts.get(name) ?? 0) + 1;
        counts.set(name, next);
        if (next === 1) orderedNames.push(name);
      }

      const labels = orderedNames.map((name) => {
        const count = counts.get(name) ?? 1;
        return count > 1 ? `${name} x${count}` : name;
      });

      const tools = labels.slice(0, 2).join(", ");
      const extra = labels.length > 2 ? ` +${labels.length - 2} more` : "";
      const line = `Running ${tools}${extra}`.replace(/\s+/g, " ").trim();
      return line.length > MAX_SNIPPET_CHARS ? `${line.slice(0, MAX_SNIPPET_CHARS).trim()}...` : line;
    }

    // Fallback: show a live snippet from the assistant's currently-streaming text.
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
    if (lastAssistant) {
      const text = lastAssistant.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("");
      const trimmedText = (text || lastAssistant.content || "").trim();
      if (trimmedText) {
        const lines = trimmedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        const line = (lines[lines.length - 1] ?? trimmedText).replace(/\s+/g, " ").trim();
        return line.length > MAX_SNIPPET_CHARS
          ? `${line.slice(0, MAX_SNIPPET_CHARS).trim()}...`
          : line;
      }
    }
    return "Working...";
  }, [elapsedSeconds, executingTools, isLoading, messages, streamStalled, thinkingState.content, toolResultsMap]);

  const pushToast = useAppStore((s) => s.pushToast);
  const lastPushedStreamErrorKeyRef = useRef<string>("");
  useEffect(() => {
    if (!streamError) return;
    const runId = activeRunIdRef.current ?? "unknown-run";
    const sessionId = currentSessionId ?? "unknown-session";
    const model = selectedModel || "unknown-model";
    const dedupeKey = `stream-error:${sessionId}:${runId}:${streamError}`;

    if (lastPushedStreamErrorKeyRef.current === dedupeKey) return;
    lastPushedStreamErrorKeyRef.current = dedupeKey;

    const detail = [
      `session_id: ${sessionId}`,
      `run_id: ${runId}`,
      `model: ${model}`,
      `elapsed_s: ${elapsedSeconds}`,
      `executing_tools: ${Array.from(executingTools).join(", ") || "(none)"}`,
      `last_event_ms_ago: ${
        lastEventTimeRef.current > 0 ? String(Date.now() - lastEventTimeRef.current) : "(unknown)"
      }`,
    ].join("\n");

    pushToast({
      kind: "error",
      title: "Stream error",
      message: streamError,
      detail,
      dedupeKey,
    });
  }, [currentSessionId, elapsedSeconds, executingTools, pushToast, selectedModel, streamError]);

  Hooks.useAvailableModels({ selectedModel, setSelectedModel, setAvailableModels });

  const { messagesContainerRef, messagesEndRef, handleScroll } = Hooks.useChatScroll({
    isLoading,
    messageCount: messages.length,
  });

  const { sessionArtifacts, artifactsByMessage, activeArtifact, clearArtifactsCache } =
    Hooks.useChatArtifacts({
      messages,
      artifactsEnabled,
      currentSessionId,
      activeArtifactId,
      setActiveArtifactId,
    });

  const {
    maxContext,
    contextMessages,
    contextStats,
    contextUsageLabel,
    contextBreakdown,
    buildContextContent,
    formatTokenCount,
    calculateMessageTokens,
    contextConfig,
  } = Hooks.useChatContext({
    messages,
    selectedModel,
    availableModels,
    effectiveSystemPrompt,
    contextPanelVisible,
    getToolDefinitions,
    isToolPart,
  });

  const { compactionHistory, compacting, compactionError, runManualCompaction, canManualCompact } =
    Hooks.useChatCompaction({
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
    });

  const showEmptyState = messages.length === 0 && !isLoading && !streamError;

  useChatPageTimers({
    isLoading,
    streamingStartTime,
    setStreamingStartTime,
    setElapsedSeconds,
    executingToolsSize: executingTools.size,
    activeRunIdRef,
    lastEventTimeRef,
    setStreamStalled,
  });

  useChatSessionBootstrap({
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
    messagesLengthRef,
    sessionIdRef,
    getLastSessionId,
    setLastSessionId,
  });

  useEffect(() => {
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    setExecutingTools(new Set());
    setToolResultsMap(new Map());
  }, [currentSessionId, setExecutingTools, setToolResultsMap]);

  useEffect(() => {
    if (!currentSessionId) {
      clearPlan();
      clearAgentFiles();
    }
  }, [currentSessionId, clearPlan, clearAgentFiles]);

  // Load MCP servers/tools when enabled
  useEffect(() => {
    if (!mcpEnabled) return;
    void loadMCPServers().then(() => {
      void loadMCPTools();
    });
  }, [mcpEnabled, loadMCPServers, loadMCPTools]);

  // Load agent files when agent mode is enabled
  useEffect(() => {
    if (!agentMode || !currentSessionId) return;
    void loadAgentFiles({ sessionId: currentSessionId });
  }, [agentMode, currentSessionId, loadAgentFiles]);

  // Load MCP servers when settings modal opens
  useEffect(() => {
    if (mcpSettingsOpen) {
      loadMCPServers();
    }
  }, [mcpSettingsOpen, loadMCPServers]);

  // Refresh usage when modal opens
  useEffect(() => {
    if (usageOpen && currentSessionId) {
      refreshUsage(currentSessionId);
    }
  }, [usageOpen, currentSessionId, refreshUsage]);

  // Export functions
  const handleExportJson = useCallback(() => {
    exportChatAsJson({
      title: currentSessionTitle,
      sessionId: currentSessionId,
      model: selectedModel,
      messages,
    });
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  const handleExportMarkdown = useCallback(() => {
    exportChatAsMarkdown({
      title: currentSessionTitle,
      sessionId: currentSessionId,
      model: selectedModel,
      messages,
    });
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  const { startRunStream } = useChatRunStream({
    activeRunIdRef,
    runAbortControllerRef,
    runCompletedRef,
    lastEventTimeRef,
    sessionIdRef,
    setIsLoading,
    setStreamError,
    setStreamStalled,
    setExecutingTools,
    setToolResultsMap,
    handleRunEvent,
  });

  const replaceUrlToSession = useCallback(
    (sessionId: string) => {
      router.replace(`/chat?session=${encodeURIComponent(sessionId)}`);
    },
    [router],
  );

  const { sendUserMessage } = useChatSendUserMessage({
    selectedModel,
    systemPrompt,
    mcpEnabled,
    deepResearchEnabled: deepResearch.enabled,
    agentMode,
    currentSessionId,
    isLoading,
    agentFiles,
    agentFileVersions,
    setInput,
    setMessages,
    setStreamError,
    setStreamingStartTime,
    lastUserInputRef,
    createSession,
    setLastSessionId,
    replaceUrlToSession,
    startRunStream,
    loadAgentFiles,
  });

  // Handle send with persistence and attachments
  const handleSend = useCallback(
    async (text: string, attachments?: Attachment[]) => {
      await sendUserMessage(text, attachments, { clearInput: true });
    },
    [sendUserMessage],
  );

  const handleReprompt = useCallback(
    async (messageId: string) => {
      if (isLoading) return;
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex <= 0) return;

      const previousUser = [...messages.slice(0, messageIndex)]
        .reverse()
        .find((msg) => msg.role === "user");

      if (!previousUser) return;

      const userText = previousUser.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (!userText.trim()) return;

      await sendUserMessage(userText);
    },
    [messages, isLoading, sendUserMessage],
  );

  const handleForkMessage = useCallback(
    async (messageId: string) => {
      if (!currentSessionId) return;
      try {
        const { session } = await api.forkChatSession(currentSessionId, {
          message_id: messageId,
          model: selectedModel || undefined,
          title: "New Chat",
        });
        updateSessions((sessions) => {
          if (sessions.some((existing) => existing.id === session.id)) {
            return sessions.map((existing) => (existing.id === session.id ? session : existing));
          }
          return [session, ...sessions];
        });
        router.push(`/chat?session=${session.id}`);
      } catch (err) {
        console.error("Failed to fork session:", err);
      }
    },
    [currentSessionId, selectedModel, router, updateSessions],
  );

  // Handle stop
  const handleStop = useCallback(async () => {
    runAbortControllerRef.current?.abort();
    const runId = activeRunIdRef.current;
    if (runId && currentSessionId) {
      try {
        await api.abortChatRun(currentSessionId, runId);
      } catch (err) {
        console.warn("Failed to abort run:", err);
      }
    }
    activeRunIdRef.current = null;
    setStreamingStartTime(null);
    setElapsedSeconds(0);
    setIsLoading(false);
  }, [currentSessionId, setElapsedSeconds, setStreamingStartTime]);

  // Handle model change and persist to localStorage
  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId);
      localStorage.setItem("vllm-studio-last-model", modelId);
    },
    [setSelectedModel],
  );

  const handleMcpToggle = useCallback(() => {
    setMcpEnabled(!mcpEnabled);
  }, [mcpEnabled, setMcpEnabled]);

  const handleArtifactsToggle = useCallback(() => {
    setArtifactsEnabled(!artifactsEnabled);
  }, [artifactsEnabled, setArtifactsEnabled]);

  const handleDeepResearchToggle = useCallback(() => {
    const nextEnabled = !deepResearch.enabled;
    setDeepResearch({ ...deepResearch, enabled: nextEnabled });
    if (nextEnabled && !mcpEnabled) setMcpEnabled(true);
  }, [deepResearch, mcpEnabled, setDeepResearch, setMcpEnabled]);

  const handleOpenMcpSettings = useCallback(() => {
    setMcpSettingsOpen(true);
  }, [setMcpSettingsOpen]);

  const handleOpenChatSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);

  const planSummary = useMemo(() => {
    if (!agentPlan?.steps?.length) return null;
    const total = agentPlan.steps.length;
    const done = agentPlan.steps.filter((s) => s.status === "done").length;
    if (done >= total) return "Plan Done";
    return `Plan ${done}/${total}`;
  }, [agentPlan]);

  const handleSetSidebarTab = useCallback(
    (tab: SidebarTab) => {
      setSidebarTab(tab);
      setResultsLastTab(tab);
    },
    [setResultsLastTab],
  );

  const handleOpenResults = useCallback(() => {
    setSidebarOpen(true);
    handleSetSidebarTab(resultsLastTab ?? "activity");
  }, [handleSetSidebarTab, resultsLastTab]);

  const toolBelt = useMemo(() => {
    return (
      <ToolBelt
        onSubmit={handleSend}
        onStop={handleStop}
        disabled={false}
        isLoading={isLoading}
        thinkingSnippet={thinkingSnippet}
        placeholder={selectedModel ? "Message..." : "Select a model"}
        onOpenResults={handleOpenResults}
        planSummary={mobilePlanChipHidden ? null : planSummary}
        planChipHidden={mobilePlanChipHidden}
        onTogglePlanChipHidden={() => setMobilePlanChipHidden(!mobilePlanChipHidden)}
        selectedModel={selectedModel}
        availableModels={availableModels}
        onModelChange={handleModelChange}
        mcpEnabled={mcpEnabled}
        onMcpToggle={handleMcpToggle}
        artifactsEnabled={artifactsEnabled}
        onArtifactsToggle={handleArtifactsToggle}
        deepResearchEnabled={deepResearch.enabled}
        onDeepResearchToggle={handleDeepResearchToggle}
        onOpenMcpSettings={handleOpenMcpSettings}
        onOpenChatSettings={handleOpenChatSettings}
        hasSystemPrompt={systemPrompt.trim().length > 0}
        planDrawer={agentPlan ? <AgentPlanDrawer plan={agentPlan} onClear={clearPlan} /> : null}
      />
    );
  }, [
    agentPlan,
    artifactsEnabled,
    availableModels,
    clearPlan,
    deepResearch,
    handleOpenResults,
    handleArtifactsToggle,
    handleDeepResearchToggle,
    handleMcpToggle,
    handleModelChange,
    handleOpenChatSettings,
    handleOpenMcpSettings,
    handleSend,
    handleStop,
    isLoading,
    mcpEnabled,
    mobilePlanChipHidden,
    planSummary,
    selectedModel,
    setMobilePlanChipHidden,
    systemPrompt,
    thinkingSnippet,
  ]);

  const { openActivityPanel, openContextPanel, handleOpenAgentFile } =
    useChatSidebarController({
      currentSessionId,
      sessionFromUrl,
      activityPanelVisible,
      thinkingActive,
      isLoading,
      executingToolsSize: executingTools.size,
      activityGroupsLength: activityGroups.length,
      sidebarOpen,
      setSidebarOpen,
      setSidebarTab: handleSetSidebarTab,
      selectAgentFile,
    });

  const hasSession = Boolean(sessionFromUrl || currentSessionId);
  const handleSelectAgentFile = useCallback(
    (path: string | null) => selectAgentFile(path, sessionFromUrl || currentSessionId),
    [currentSessionId, selectAgentFile, sessionFromUrl],
  );

  const handleCloseArtifactModal = useCallback(() => {
    setActiveArtifactId(null);
  }, [setActiveArtifactId]);

  return {
    sidebarOpen,
    setSidebarOpen,
    sidebarTab,
    setSidebarTab: handleSetSidebarTab,
    sidebarWidth,
    setSidebarWidth,
    activityGroups,
    activityCount,
    agentPlan,
    thinkingActive,
    isLoading,
    streamError,
    streamStalled,
    thinkingSnippet,
    contextStats,
    contextBreakdown,
    contextUsageLabel,
    compactionHistory,
    compacting,
    compactionError,
    formatTokenCount,
    runManualCompaction,
    canManualCompact,
    artifactsEnabled,
    sessionArtifacts,
    artifactsByMessage,
    activeArtifact,
    onCloseArtifactModal: handleCloseArtifactModal,
    agentFiles,
    agentFileVersions,
    selectedAgentFilePath,
    selectedAgentFileContent,
    selectedAgentFileLoading,
    onSelectAgentFile: handleSelectAgentFile,
    hasSession,
    onOpenAgentFile: handleOpenAgentFile,
    messages,
    selectedModel,
    showEmptyState,
    onForkMessage: handleForkMessage,
    onReprompt: handleReprompt,
    openActivityPanel,
    openContextPanel,
    handleScroll,
    messagesContainerRef,
    messagesEndRef,
    toolBelt,
    settingsOpen,
    setSettingsOpen,
    mcpSettingsOpen,
    setMcpSettingsOpen,
    usageOpen,
    setUsageOpen,
    exportOpen,
    setExportOpen,
    systemPrompt,
    setSystemPrompt,
    setSelectedModel,
    availableModels,
    deepResearch,
    setDeepResearch,
    mcpServers,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
    loadMCPServers,
    sessionUsage,
    onExportJson: handleExportJson,
    onExportMarkdown: handleExportMarkdown,
  };
}
