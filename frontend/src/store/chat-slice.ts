import type { StateCreator } from "zustand";
import type { ChatSession, ToolCall, ToolResult } from "@/lib/types";
import { loadState } from "@/lib/chat-state-persistence";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  request_prompt_tokens?: number | null;
  request_tools_tokens?: number | null;
  request_total_input_tokens?: number | null;
  request_completion_tokens?: number | null;
  estimated_cost_usd?: number | null;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
  icon?: string;
}

export interface MCPTool {
  server: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  status: "pending" | "fetching" | "done" | "error";
  relevance?: number;
}

export interface ResearchProgress {
  stage: "searching" | "analyzing" | "synthesizing" | "done" | "error";
  message: string;
  sources: ResearchSource[];
  totalSteps: number;
  currentStep: number;
  searchQueries?: string[];
  error?: string;
}

export interface DeepResearchSettings {
  enabled: boolean;
  numSources: number;
  autoSummarize: boolean;
  includeCitations: boolean;
  searchDepth: "quick" | "normal" | "thorough";
}

export interface SessionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number | null;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSessionTitle: string;
  sessionsLoading: boolean;
  sessionsAvailable: boolean;

  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;

  streamingStartTime: number | null;
  elapsedSeconds: number;
  queuedContext: string;

  runningModel: string | null;
  modelName: string;
  selectedModel: string;
  availableModels: Array<{ id: string; root?: string; max_model_len?: number }>;
  pageLoading: boolean;

  copiedIndex: number | null;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  toolPanelOpen: boolean;
  activePanel: "tools" | "artifacts";
  historyDropdownOpen: boolean;

  mcpEnabled: boolean;
  artifactsEnabled: boolean;
  mcpServers: MCPServerConfig[];
  mcpSettingsOpen: boolean;
  mcpTools: MCPTool[];
  executingTools: Set<string>;
  toolResultsMap: Map<string, ToolResult>;

  systemPrompt: string;
  chatSettingsOpen: boolean;

  deepResearch: DeepResearchSettings;
  researchProgress: ResearchProgress | null;
  researchSources: ResearchSource[];

  sessionUsage: SessionUsage | null;
  usageDetailsOpen: boolean;
  exportOpen: boolean;

  messageSearchOpen: boolean;
  bookmarkedMessages: Set<string>;
  editingTitle: boolean;
  titleDraft: string;
  userScrolledUp: boolean;
}

export interface ChatActions {
  setSessions: (sessions: ChatSession[]) => void;
  updateSessions: (updater: (sessions: ChatSession[]) => ChatSession[]) => void;
  setCurrentSessionId: (currentSessionId: string | null) => void;
  setCurrentSessionTitle: (currentSessionTitle: string) => void;
  setSessionsLoading: (sessionsLoading: boolean) => void;
  setSessionsAvailable: (sessionsAvailable: boolean) => void;

  setMessages: (messages: ChatMessage[]) => void;
  updateMessages: (updater: (messages: ChatMessage[]) => ChatMessage[]) => void;

  setInput: (input: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  setStreamingStartTime: (streamingStartTime: number | null) => void;
  setElapsedSeconds: (elapsedSeconds: number) => void;
  setQueuedContext: (queuedContext: string) => void;

  setRunningModel: (runningModel: string | null) => void;
  setModelName: (modelName: string) => void;
  setSelectedModel: (selectedModel: string) => void;
  setAvailableModels: (
    availableModels: Array<{ id: string; root?: string; max_model_len?: number }>,
  ) => void;
  setPageLoading: (pageLoading: boolean) => void;

  setCopiedIndex: (copiedIndex: number | null) => void;
  setSidebarCollapsed: (sidebarCollapsed: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setToolPanelOpen: (toolPanelOpen: boolean) => void;
  setActivePanel: (activePanel: "tools" | "artifacts") => void;
  setHistoryDropdownOpen: (historyDropdownOpen: boolean) => void;

  setMcpEnabled: (mcpEnabled: boolean) => void;
  setArtifactsEnabled: (artifactsEnabled: boolean) => void;
  setMcpServers: (mcpServers: MCPServerConfig[]) => void;
  setMcpSettingsOpen: (mcpSettingsOpen: boolean) => void;
  setMcpTools: (mcpTools: MCPTool[]) => void;
  setExecutingTools: (executingTools: Set<string>) => void;
  updateExecutingTools: (updater: (executingTools: Set<string>) => Set<string>) => void;
  setToolResultsMap: (toolResultsMap: Map<string, ToolResult>) => void;
  updateToolResultsMap: (
    updater: (toolResultsMap: Map<string, ToolResult>) => Map<string, ToolResult>,
  ) => void;

  setSystemPrompt: (systemPrompt: string) => void;
  setChatSettingsOpen: (chatSettingsOpen: boolean) => void;

  setDeepResearch: (deepResearch: DeepResearchSettings) => void;
  setResearchProgress: (researchProgress: ResearchProgress | null) => void;
  setResearchSources: (researchSources: ResearchSource[]) => void;

  setSessionUsage: (sessionUsage: SessionUsage | null) => void;
  setUsageDetailsOpen: (usageDetailsOpen: boolean) => void;
  setExportOpen: (exportOpen: boolean) => void;

  setMessageSearchOpen: (messageSearchOpen: boolean) => void;
  setBookmarkedMessages: (bookmarkedMessages: Set<string>) => void;
  updateBookmarkedMessages: (updater: (bookmarkedMessages: Set<string>) => Set<string>) => void;
  setEditingTitle: (editingTitle: boolean) => void;
  setTitleDraft: (titleDraft: string) => void;
  setUserScrolledUp: (userScrolledUp: boolean) => void;
}

export type ChatSlice = ChatState & ChatActions;

const DEFAULT_DEEP_RESEARCH: DeepResearchSettings = {
  enabled: false,
  numSources: 5,
  autoSummarize: true,
  includeCitations: true,
  searchDepth: "normal",
};

const getPersistedState = () => {
  if (typeof window === "undefined") return null;
  const restored = loadState();
  let deepResearch = DEFAULT_DEEP_RESEARCH;
  try {
    const stored = localStorage.getItem("vllm-studio-deep-research");
    if (stored) deepResearch = { ...deepResearch, ...JSON.parse(stored) };
  } catch {}

  return {
    input: restored.input,
    mcpEnabled: restored.mcpEnabled,
    artifactsEnabled: restored.artifactsEnabled,
    systemPrompt: restored.systemPrompt,
    selectedModel: restored.selectedModel,
    sidebarCollapsed: restored.sidebarCollapsed,
    deepResearch,
  };
};

const persisted = getPersistedState();

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  sessions: [],
  currentSessionId: null,
  currentSessionTitle: "New Chat",
  sessionsLoading: true,
  sessionsAvailable: true,

  messages: [],
  input: persisted?.input ?? "",
  isLoading: false,
  error: null,

  streamingStartTime: null,
  elapsedSeconds: 0,
  queuedContext: "",

  runningModel: null,
  modelName: "",
  selectedModel: persisted?.selectedModel ?? "",
  availableModels: [],
  pageLoading: true,

  copiedIndex: null,
  sidebarCollapsed: persisted?.sidebarCollapsed ?? false,
  isMobile: false,
  toolPanelOpen: true,
  activePanel: "tools",
  historyDropdownOpen: false,

  mcpEnabled: persisted?.mcpEnabled ?? false,
  artifactsEnabled: persisted?.artifactsEnabled ?? false,
  mcpServers: [],
  mcpSettingsOpen: false,
  mcpTools: [],
  executingTools: new Set(),
  toolResultsMap: new Map(),

  systemPrompt: persisted?.systemPrompt ?? "",
  chatSettingsOpen: false,

  deepResearch: persisted?.deepResearch ?? DEFAULT_DEEP_RESEARCH,
  researchProgress: null,
  researchSources: [],

  sessionUsage: null,
  usageDetailsOpen: false,
  exportOpen: false,

  messageSearchOpen: false,
  bookmarkedMessages: new Set(),
  editingTitle: false,
  titleDraft: "",
  userScrolledUp: false,

  setSessions: (sessions) => set({ sessions }),
  updateSessions: (updater) => set((state) => ({ sessions: updater(state.sessions) })),
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
  setCurrentSessionTitle: (currentSessionTitle) => set({ currentSessionTitle }),
  setSessionsLoading: (sessionsLoading) => set({ sessionsLoading }),
  setSessionsAvailable: (sessionsAvailable) => set({ sessionsAvailable }),

  setMessages: (messages) => set({ messages }),
  updateMessages: (updater) => set((state) => ({ messages: updater(state.messages) })),

  setInput: (input) => set({ input }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setStreamingStartTime: (streamingStartTime) => set({ streamingStartTime }),
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
  setQueuedContext: (queuedContext) => set({ queuedContext }),

  setRunningModel: (runningModel) => set({ runningModel }),
  setModelName: (modelName) => set({ modelName }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setAvailableModels: (availableModels) => set({ availableModels }),
  setPageLoading: (pageLoading) => set({ pageLoading }),

  setCopiedIndex: (copiedIndex) => set({ copiedIndex }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setToolPanelOpen: (toolPanelOpen) => set({ toolPanelOpen }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setHistoryDropdownOpen: (historyDropdownOpen) => set({ historyDropdownOpen }),

  setMcpEnabled: (mcpEnabled) => set({ mcpEnabled }),
  setArtifactsEnabled: (artifactsEnabled) => set({ artifactsEnabled }),
  setMcpServers: (mcpServers) => set({ mcpServers }),
  setMcpSettingsOpen: (mcpSettingsOpen) => set({ mcpSettingsOpen }),
  setMcpTools: (mcpTools) => set({ mcpTools }),
  setExecutingTools: (executingTools) => set({ executingTools }),
  updateExecutingTools: (updater) =>
    set((state) => ({ executingTools: updater(state.executingTools) })),
  setToolResultsMap: (toolResultsMap) => set({ toolResultsMap }),
  updateToolResultsMap: (updater) =>
    set((state) => ({ toolResultsMap: updater(state.toolResultsMap) })),

  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setChatSettingsOpen: (chatSettingsOpen) => set({ chatSettingsOpen }),

  setDeepResearch: (deepResearch) => set({ deepResearch }),
  setResearchProgress: (researchProgress) => set({ researchProgress }),
  setResearchSources: (researchSources) => set({ researchSources }),

  setSessionUsage: (sessionUsage) => set({ sessionUsage }),
  setUsageDetailsOpen: (usageDetailsOpen) => set({ usageDetailsOpen }),
  setExportOpen: (exportOpen) => set({ exportOpen }),

  setMessageSearchOpen: (messageSearchOpen) => set({ messageSearchOpen }),
  setBookmarkedMessages: (bookmarkedMessages) => set({ bookmarkedMessages }),
  updateBookmarkedMessages: (updater) =>
    set((state) => ({ bookmarkedMessages: updater(state.bookmarkedMessages) })),
  setEditingTitle: (editingTitle) => set({ editingTitle }),
  setTitleDraft: (titleDraft) => set({ titleDraft }),
  setUserScrolledUp: (userScrolledUp) => set({ userScrolledUp }),
});
