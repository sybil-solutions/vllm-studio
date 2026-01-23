"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { api } from "@/lib/api";
import { extractArtifacts } from "../artifacts/artifact-renderer";
import { ToolBelt } from "../input/tool-belt";
import { ChatSidePanel } from "./chat-side-panel";
import { ChatConversation } from "./chat-conversation";
import { ChatTopControls } from "./chat-top-controls";
import { ChatActionButtons } from "./chat-action-buttons";
import { ChatToolbeltDock } from "./chat-toolbelt-dock";
import { ChatModals } from "./chat-modals";
import { useChatSessions } from "../../hooks/use-chat-sessions";
import { useChatTools } from "../../hooks/use-chat-tools";
import { useChatUsage } from "../../hooks/use-chat-usage";
import { useChatDerived } from "../../hooks/use-chat-derived";
import { useChatTransport } from "../../hooks/use-chat-transport";
import type { ActivePanel, DeepResearchConfig, SessionUsage } from "@/lib/types";
import type { UIMessage } from "@ai-sdk/react";
import type { Artifact } from "@/lib/types";
import { useContextManagement } from "@/lib/services/context-management";
import { useAppStore } from "@/store";
import type { Attachment, ModelOption } from "../../types";

export function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionFromUrl = searchParams.get("session");
  const newChatFromUrl = searchParams.get("new") === "1";

  // Local UI state
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [toolPanelOpen, setToolPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>("activity");
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [artifactsEnabled, setArtifactsEnabled] = useState(false);
  const [deepResearch, setDeepResearch] = useState<DeepResearchConfig>({
    enabled: false,
    maxSources: 10,
    searchDepth: "medium",
    autoSummarize: true,
    includeCitations: true,
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [streamingStartTime, setStreamingStartTime] = useState<number | null>(null);
  const [queuedContext, setQueuedContext] = useState("");
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mcpSettingsOpen, setMcpSettingsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [sessionUsage, setSessionUsage] = useState<SessionUsage | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Sessions hook
  const {
    currentSessionId,
    currentSessionTitle,
    loadSessions,
    loadSession,
    startNewSession,
    setCurrentSessionId,
    setCurrentSessionTitle,
  } = useChatSessions();

  // Tools hook
  const {
    mcpServers,
    mcpTools,
    loadMCPServers,
    loadMCPTools,
    getToolDefinitions,
    executeTool,
    executingTools,
    toolResultsMap,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
  } = useChatTools({ mcpEnabled });

  // Usage hook
  const { refreshUsage } = useChatUsage({ setSessionUsage });

  // Transport hook for persistence
  const { persistMessage, createSessionWithMessage, generateTitle, sessionIdRef } =
    useChatTransport({
      currentSessionId,
      setCurrentSessionId,
      setCurrentSessionTitle,
      selectedModel,
    });

  const { calculateStats, formatTokenCount } = useContextManagement();
  const updateSessions = useAppStore((state) => state.updateSessions);

  // Track the last user input for title generation
  const lastUserInputRef = useRef<string>("");
  const autoArtifactSwitchRef = useRef(false);

  const resolveToolDefinitions = useCallback(async () => {
    if (!mcpEnabled) return [];
    if (mcpTools.length > 0) {
      return getToolDefinitions?.(mcpTools) ?? [];
    }
    const loadedTools = await loadMCPTools();
    const tools = loadedTools.length > 0 ? loadedTools : mcpTools;
    return getToolDefinitions?.(tools) ?? [];
  }, [mcpEnabled, mcpTools, loadMCPTools, getToolDefinitions]);

  // Create transport for useChat (static; request-level body passed on send)
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    [],
  );

  // AI SDK useChat - the source of truth for messages
  const { messages, sendMessage, stop, status, error, setMessages, addToolOutput } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const toolCallId = toolCall.toolCallId;
      const toolName = toolCall.toolName;
      const result = await executeTool({
        toolCallId,
        toolName,
        args: (toolCall as { input?: unknown }).input as Record<string, unknown>,
      });
      if (result.isError) {
        addToolOutput({
          tool: toolName as never,
          toolCallId,
          state: "output-error",
          errorText: result.content || "Tool execution failed",
        });
      } else {
        addToolOutput({
          tool: toolName as never,
          toolCallId,
          output: result.content as never,
        });
      }
    },
    onFinish: async ({ message }) => {
      setStreamingStartTime(null);
      setElapsedSeconds(0);

      const activeSessionId = sessionIdRef.current ?? currentSessionId;

      // Persist assistant message
      if (activeSessionId && message.role === "assistant") {
        await persistMessage(activeSessionId, message);

        // Generate title if this is the first exchange
        if (
          (currentSessionTitle === "New Chat" || currentSessionTitle === "Chat") &&
          lastUserInputRef.current
        ) {
          const textContent = message.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("");
          await generateTitle(activeSessionId, lastUserInputRef.current, textContent);
        }
      }
    },
    onError: (err) => {
      console.error("Chat error:", err);
      setStreamingStartTime(null);
      setElapsedSeconds(0);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Derived state from messages
  const { thinkingActive, activityGroups } = useChatDerived({
    messages,
    isLoading,
    executingTools,
    toolResultsMap,
  });

  const activityCount = useMemo(() => {
    return activityGroups.reduce(
      (sum, group) => sum + group.toolItems.length + (group.thinkingContent ? 1 : 0),
      0,
    );
  }, [activityGroups]);

  const selectedModelMeta = useMemo(
    () => availableModels.find((model) => model.id === selectedModel),
    [availableModels, selectedModel],
  );

  const maxContext = selectedModel ? (selectedModelMeta?.maxModelLen ?? 32768) : undefined;

  const contextStats = useMemo(() => {
    if (!maxContext) return null;

    const contextMessages = messages
      .map((message) => {
        const textContent = message.parts
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("");

        const toolContent = message.parts
          .filter(
            (
              part,
            ): part is UIMessage["parts"][number] & {
              input?: unknown;
              output?: unknown;
              errorText?: string;
            } => {
              if (typeof part.type !== "string") return false;
              return part.type === "dynamic-tool" || part.type.startsWith("tool-");
            },
          )
          .map((part) => {
            const input = "input" in part && part.input != null ? JSON.stringify(part.input) : "";
            const output =
              "output" in part && part.output != null ? JSON.stringify(part.output) : "";
            const errorText = "errorText" in part && part.errorText ? part.errorText : "";
            return [input, output, errorText].filter(Boolean).join("\n");
          })
          .filter((value) => value.length > 0)
          .join("\n");

        const combined = [textContent, toolContent].filter(Boolean).join("\n");

        return {
          role: message.role,
          content: combined,
        };
      })
      .filter((message) => message.content.trim().length > 0);

    const tools = getToolDefinitions?.() ?? [];

    return calculateStats(contextMessages, maxContext, systemPrompt, tools);
  }, [messages, maxContext, systemPrompt, getToolDefinitions, calculateStats]);

  const contextUsageLabel = useMemo(() => {
    if (!contextStats) return null;
    return `${formatTokenCount(contextStats.currentTokens)} / ${formatTokenCount(
      contextStats.maxContext,
    )}`;
  }, [contextStats, formatTokenCount]);

  const sessionArtifacts = useMemo(() => {
    if (!artifactsEnabled || messages.length === 0) return [];

    const artifacts: Artifact[] = [];
    messages.forEach((msg) => {
      if (msg.role !== "assistant") return;

      const textContent = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      if (!textContent) return;

      const { artifacts: extracted } = extractArtifacts(textContent);
      extracted.forEach((artifact, index) => {
        artifacts.push({
          ...artifact,
          id: `${msg.id}-${index}`,
          message_id: msg.id,
          session_id: currentSessionId || undefined,
        });
      });
    });

    return artifacts;
  }, [messages, artifactsEnabled, currentSessionId]);

  useEffect(() => {
    if (sessionArtifacts.length === 0) {
      autoArtifactSwitchRef.current = false;
      return;
    }

    if (!autoArtifactSwitchRef.current) {
      autoArtifactSwitchRef.current = true;
      const timeoutId = window.setTimeout(() => {
        setActivePanel("artifacts");
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [sessionArtifacts.length]);

  const showEmptyState = messages.length === 0 && !isLoading && !error;

  // Scroll handling
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setUserScrolledUp(distanceFromBottom >= 160);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isLoading ? "auto" : "smooth",
      });
    }
  }, [isLoading, messages, userScrolledUp]);

  // Elapsed time timer
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isLoading && streamingStartTime) {
      intervalId = setInterval(
        () => setElapsedSeconds(Math.floor((Date.now() - streamingStartTime) / 1000)),
        1000,
      );
    } else if (!isLoading) {
      const timeoutId = setTimeout(() => {
        if (!isLoading) {
          setStreamingStartTime(null);
          setElapsedSeconds(0);
        }
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading, streamingStartTime]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handle URL session/new params
  useEffect(() => {
    if (newChatFromUrl) {
      startNewSession();
      setMessages([]);
      return;
    }
    if (sessionFromUrl) {
      void loadSession(sessionFromUrl);
    }
  }, [newChatFromUrl, sessionFromUrl, startNewSession, loadSession, setMessages]);

  // Load MCP servers/tools when enabled
  useEffect(() => {
    if (mcpEnabled) {
      loadMCPServers();
      loadMCPTools();
    }
  }, [mcpEnabled, loadMCPServers, loadMCPTools]);

  // Load available models from recipes on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await api.getRecipes();
        // Map recipes to model options - ONLY use served_model_name
        const mappedModels = (data.recipes || [])
          .filter((recipe) => recipe.served_model_name) // Only recipes with served_model_name
          .map((recipe) => ({
            id: recipe.served_model_name!,
            name: recipe.served_model_name!,
            maxModelLen: recipe.max_model_len,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setAvailableModels(mappedModels);

        // Try to restore last used model from localStorage
        const lastModel = localStorage.getItem("vllm-studio-last-model");
        const fallbackModel = mappedModels[0]?.id || "";

        setSelectedModel((current) => {
          let next = current;
          if (lastModel && mappedModels.some((m) => m.id === lastModel)) {
            next = lastModel;
          } else if (!current || !mappedModels.some((m) => m.id === current)) {
            // Auto-select first model if none selected or selection is invalid
            next = fallbackModel;
          }

          if (next && next !== current) {
            localStorage.setItem("vllm-studio-last-model", next);
          }

          return next;
        });
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    };
    loadModels();
  }, []);

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
    const data = {
      title: currentSessionTitle,
      sessionId: currentSessionId,
      model: selectedModel,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: m.parts,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${currentSessionId || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  const handleExportMarkdown = useCallback(() => {
    let md = `# ${currentSessionTitle}\n\n`;
    md += `Model: ${selectedModel}\n`;
    md += `Exported: ${new Date().toLocaleString()}\n\n---\n\n`;

    for (const msg of messages) {
      const role = msg.role === "user" ? "**User**" : "**Assistant**";
      md += `${role}:\n\n`;
      for (const part of msg.parts) {
        if (part.type === "text") {
          md += `${(part as { text: string }).text}\n\n`;
        } else if (part.type.startsWith("tool-") && "toolCallId" in part) {
          md += `> Tool: ${part.type.replace(/^tool-/, "")}\n\n`;
        }
      }
      md += "---\n\n";
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${currentSessionId || "export"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  const sendUserMessage = useCallback(
    async (text: string, attachments?: Attachment[], options?: { clearInput?: boolean }) => {
      if (!selectedModel) return;
      if (!text.trim() && (!attachments || attachments.length === 0)) return;
      if (isLoading) return;

      // Only open side panel on desktop
      if (window.innerWidth >= 768) {
        setToolPanelOpen(true);
        setActivePanel("activity");
      }
      setStreamingStartTime(Date.now());

      if (options?.clearInput) {
        setInput("");
      }

      // Store for title generation
      lastUserInputRef.current = text;

      // Build message parts including attachments
      const parts: UIMessage["parts"] = [];
      if (text.trim()) {
        parts.push({ type: "text", text });
      }

      // Add image attachments as file parts
      if (attachments) {
        for (const att of attachments) {
          if (att.type === "image" && att.base64) {
            // Note: AI SDK supports image parts, add as experimental_attachments in sendMessage
            parts.push({
              type: "text",
              text: `[Image: ${att.name}]`,
            });
          } else if (att.type === "file" && att.file) {
            // For files, add file name reference
            parts.push({
              type: "text",
              text: `[File: ${att.name}]`,
            });
          }
        }
      }

      const userMessage: UIMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        parts,
      };

      // Create session if needed, then persist user message
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createSessionWithMessage(userMessage);
      } else {
        await persistMessage(sessionId, userMessage);
      }

      const toolDefinitions = await resolveToolDefinitions();
      const trimmedSystem = systemPrompt?.trim() || undefined;

      console.info("[CHAT UI] context", {
        model: selectedModel,
        systemLength: trimmedSystem?.length ?? 0,
        messageCount: messages.length + 1,
        tools: toolDefinitions.map((tool) => tool.name),
        mcpEnabled,
      });

      // Send the message via AI SDK - use simple text format
      // Note: For image attachments, the files would need to be passed as FileList
      // but our current attachment handling uses base64. For now, just send text.
      sendMessage(
        {
          text,
        },
        {
          body: {
            model: selectedModel || undefined,
            system: trimmedSystem,
            tools: toolDefinitions,
          },
        },
      );
    },
    [
      isLoading,
      sendMessage,
      currentSessionId,
      createSessionWithMessage,
      persistMessage,
      selectedModel,
      resolveToolDefinitions,
      systemPrompt,
      messages.length,
      mcpEnabled,
    ],
  );

  // Handle send with persistence and attachments
  const handleSend = useCallback(
    async (attachments?: Attachment[]) => {
      await sendUserMessage(input, attachments, { clearInput: true });
    },
    [input, sendUserMessage],
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
  const handleStop = useCallback(() => {
    stop();
    setStreamingStartTime(null);
    setElapsedSeconds(0);
  }, [stop]);

  // Handle model change and persist to localStorage
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("vllm-studio-last-model", modelId);
  }, []);

  const toolBelt = (
    <ToolBelt
      value={input}
      onChange={setInput}
      onSubmit={handleSend}
      onStop={handleStop}
      disabled={!selectedModel}
      isLoading={isLoading}
      placeholder={selectedModel ? "Message..." : "Select a model"}
      selectedModel={selectedModel}
      availableModels={availableModels}
      onModelChange={handleModelChange}
      mcpEnabled={mcpEnabled}
      onMcpToggle={() => setMcpEnabled(!mcpEnabled)}
      artifactsEnabled={artifactsEnabled}
      onArtifactsToggle={() => setArtifactsEnabled(!artifactsEnabled)}
      deepResearchEnabled={deepResearch.enabled}
      onDeepResearchToggle={() => {
        const nextEnabled = !deepResearch.enabled;
        setDeepResearch({ ...deepResearch, enabled: nextEnabled });
        if (nextEnabled && !mcpEnabled) setMcpEnabled(true);
      }}
      elapsedSeconds={elapsedSeconds}
      queuedContext={queuedContext}
      onQueuedContextChange={setQueuedContext}
      onOpenMcpSettings={() => setMcpSettingsOpen(true)}
      onOpenChatSettings={() => setSettingsOpen(true)}
      hasSystemPrompt={systemPrompt.trim().length > 0}
    />
  );

  return (
    <div className="relative h-full flex overflow-hidden w-full max-w-full">
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
        <div className="flex-1 flex overflow-hidden relative min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
            <ChatConversation
              messages={messages}
              isLoading={isLoading}
              error={error?.message}
              artifactsEnabled={artifactsEnabled}
              selectedModel={selectedModel}
              contextUsageLabel={contextUsageLabel}
              onFork={handleForkMessage}
              onReprompt={handleReprompt}
              showEmptyState={showEmptyState}
              toolBelt={toolBelt}
              onScroll={handleScroll}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
            />

            <ChatTopControls
              onOpenSidebar={() => {
                window.dispatchEvent(
                  new CustomEvent("vllm:toggle-sidebar", { detail: { open: true } }),
                );
              }}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <ChatActionButtons
              activityCount={activityCount}
              onOpenActivity={() => setToolPanelOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenMcpSettings={() => setMcpSettingsOpen(true)}
              onOpenUsage={() => setUsageOpen(true)}
              onOpenExport={() => setExportOpen(true)}
            />

            <ChatToolbeltDock toolBelt={toolBelt} showEmptyState={showEmptyState} />
          </div>

          {toolPanelOpen && (
            <ChatSidePanel
              isOpen={toolPanelOpen}
              onClose={() => setToolPanelOpen(false)}
              activePanel={activePanel}
              onSetActivePanel={setActivePanel}
              activityGroups={activityGroups}
              thinkingActive={thinkingActive}
              executingTools={executingTools}
              artifacts={sessionArtifacts}
            />
          )}
        </div>
      </div>

      <ChatModals
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
        mcpSettingsOpen={mcpSettingsOpen}
        onCloseMcpSettings={() => setMcpSettingsOpen(false)}
        usageOpen={usageOpen}
        onCloseUsage={() => setUsageOpen(false)}
        exportOpen={exportOpen}
        onCloseExport={() => setExportOpen(false)}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        selectedModel={selectedModel}
        onSelectedModelChange={setSelectedModel}
        availableModels={availableModels}
        deepResearch={deepResearch}
        onDeepResearchChange={setDeepResearch}
        mcpServers={mcpServers}
        onAddServer={addMcpServer}
        onUpdateServer={updateMcpServer}
        onRemoveServer={removeMcpServer}
        onRefreshServers={loadMCPServers}
        sessionUsage={sessionUsage}
        messages={messages}
        onExportJson={handleExportJson}
        onExportMarkdown={handleExportMarkdown}
      />
    </div>
  );
}
