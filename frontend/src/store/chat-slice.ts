// CRITICAL
import type { StateCreator } from "zustand";

import type { AgentFileVersion } from "@/lib/types";
import type { ChatSlice } from "./chat-slice-types";
import { DEFAULT_ARTIFACT_VIEWER_ENTRY, DEFAULT_CODE_BLOCK_ENTRY, DEFAULT_DEEP_RESEARCH } from "./chat-slice-defaults";

export type { ChatSlice } from "./chat-slice-types";

function areArtifactViewerEntriesEqual(
  a: typeof DEFAULT_ARTIFACT_VIEWER_ENTRY,
  b: typeof DEFAULT_ARTIFACT_VIEWER_ENTRY,
) {
  if (a === b) return true;
  return (
    a.isFullscreen === b.isFullscreen &&
    a.showCode === b.showCode &&
    a.copied === b.copied &&
    a.scale === b.scale &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.isDragging === b.isDragging &&
    a.isRunning === b.isRunning &&
    (a.error ?? null) === (b.error ?? null)
  );
}

function areCodeBlockEntriesEqual(a: typeof DEFAULT_CODE_BLOCK_ENTRY, b: typeof DEFAULT_CODE_BLOCK_ENTRY) {
  if (a === b) return true;
  return a.copied === b.copied && a.isExpanded === b.isExpanded;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  // Sessions
  sessions: [],
  currentSessionId: null,
  currentSessionTitle: "New Chat",
  sessionsLoading: true,

  // Input
  input: "",
  error: null,

  // Streaming
  streamingStartTime: null,
  elapsedSeconds: 0,
  lastRunDurationSeconds: null,
  runDurationsByRunId: {},
  queuedContext: "",

  // Model
  selectedModel: "",
  availableModels: [],

  // Layout
  isMobile: false,
  userScrolledUp: false,

  // MCP & tools
  mcpEnabled: false,
  artifactsEnabled: false,
  mcpServers: [],
  mcpSettingsOpen: false,
  mcpTools: [],
  executingTools: new Set(),
  toolResultsMap: new Map(),

  // Settings
  systemPrompt: "",
  chatSettingsOpen: false,
  deepResearch: DEFAULT_DEEP_RESEARCH,

  // Usage & export
  sessionUsage: null,
  usageDetailsOpen: false,
  exportOpen: false,

  // Attachments & recording
  attachments: [],
  isRecording: false,
  isTranscribing: false,
  transcriptionError: null,
  recordingDuration: 0,
  isTTSEnabled: false,

  // MCP action state
  mcpPendingServer: null,
  mcpActionError: null,

  // Message UI state
  copiedMessageId: null,
  messageInlineThinkingExpanded: {},
  messageInlineToolsExpanded: {},
  toolCallGroupsExpanded: {},

  // Artifacts
  activeArtifactId: null,
  artifactViewerState: {},

  // Code blocks & sandboxes
  codeBlockState: {},
  mermaidState: {},

  // Splash
  splashIsMobile: false,

  // Agent mode
  agentMode: true,
  agentPlan: null,
  agentFiles: [],
  agentFilesLoading: false,
  selectedAgentFilePath: null,
  selectedAgentFileContent: null,
  selectedAgentFileLoading: false,
  agentFileVersions: {},
  sidebarWidth: 400,
  resultsLastTab: null,
  mobilePlanChipHidden: false,
  toasts: [],

  // --- Actions ---

  // Sessions
  setSessions: (sessions) => set({ sessions }),
  updateSessions: (updater) => set((state) => ({ sessions: updater(state.sessions) })),
  setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
  setCurrentSessionTitle: (currentSessionTitle) => set({ currentSessionTitle }),
  setSessionsLoading: (sessionsLoading) => set({ sessionsLoading }),

  // Input
  setInput: (input) => set({ input }),
  setError: (error) => set({ error }),

  // Streaming
  setStreamingStartTime: (streamingStartTime) => set({ streamingStartTime }),
  setElapsedSeconds: (elapsedSeconds) => set({ elapsedSeconds }),
  setLastRunDurationSeconds: (seconds) => set({ lastRunDurationSeconds: seconds }),
  setRunDurationForRunId: (runId, seconds) =>
    set((state) => {
      if (!runId) return state;
      const prev = state.runDurationsByRunId[runId];
      if (prev === seconds) return state;

      // Prevent unbounded growth.
      const keys = Object.keys(state.runDurationsByRunId);
      let next = state.runDurationsByRunId;
      if (keys.length > 80 && !(runId in next)) {
        // Drop oldest-ish by insertion order (object order) best-effort.
        const keep = new Set(keys.slice(-60));
        keep.add(runId);
        const trimmed: Record<string, number> = {};
        for (const k of keys) {
          if (keep.has(k)) trimmed[k] = next[k]!;
        }
        next = trimmed;
      }

      return { runDurationsByRunId: { ...next, [runId]: seconds } };
    }),
  setQueuedContext: (queuedContext) => set({ queuedContext }),

  // Model
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setAvailableModels: (availableModels) => set({ availableModels }),

  // Layout
  setIsMobile: (isMobile) => set({ isMobile }),
  setUserScrolledUp: (userScrolledUp) => set({ userScrolledUp }),

  // MCP & tools
  setMcpEnabled: (mcpEnabled) => set({ mcpEnabled }),
  setArtifactsEnabled: (artifactsEnabled) => set({ artifactsEnabled }),
  setActiveArtifactId: (activeArtifactId) => set({ activeArtifactId }),
  setMcpServers: (mcpServers) => set({ mcpServers }),
  setMcpSettingsOpen: (mcpSettingsOpen) => set({ mcpSettingsOpen }),
  setMcpTools: (mcpTools) => set({ mcpTools }),
  setExecutingTools: (executingTools) =>
    set((state) => {
      if (state.executingTools === executingTools) return state;
      if (state.executingTools.size === 0 && executingTools.size === 0) return state;
      return { executingTools };
    }),
  updateExecutingTools: (updater) =>
    set((state) => {
      const next = updater(state.executingTools);
      if (next === state.executingTools) return state;
      if (state.executingTools.size === 0 && next.size === 0) return state;
      return { executingTools: next };
    }),
  setToolResultsMap: (toolResultsMap) =>
    set((state) => {
      if (state.toolResultsMap === toolResultsMap) return state;
      if (state.toolResultsMap.size === 0 && toolResultsMap.size === 0) return state;
      return { toolResultsMap };
    }),
  updateToolResultsMap: (updater) =>
    set((state) => {
      const next = updater(state.toolResultsMap);
      if (next === state.toolResultsMap) return state;
      if (state.toolResultsMap.size === 0 && next.size === 0) return state;
      return { toolResultsMap: next };
    }),

  // Settings
  setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
  setChatSettingsOpen: (chatSettingsOpen) => set({ chatSettingsOpen }),
  setDeepResearch: (deepResearch) => set({ deepResearch }),

  // Usage & export
  setSessionUsage: (sessionUsage) => set({ sessionUsage }),
  setUsageDetailsOpen: (usageDetailsOpen) => set({ usageDetailsOpen }),
  setExportOpen: (exportOpen) => set({ exportOpen }),

  // Attachments & recording
  setAttachments: (attachments) => set({ attachments }),
  updateAttachments: (updater) =>
    set((state) => ({ attachments: updater(state.attachments) })),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
  setTranscriptionError: (transcriptionError) => set({ transcriptionError }),
  setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
  setIsTTSEnabled: (isTTSEnabled) => set({ isTTSEnabled }),

  // MCP action state
  setMcpPendingServer: (mcpPendingServer) => set({ mcpPendingServer }),
  setMcpActionError: (mcpActionError) => set({ mcpActionError }),

  // Message UI state
  setCopiedMessageId: (copiedMessageId) =>
    set((state) => (state.copiedMessageId === copiedMessageId ? state : { copiedMessageId })),
  setMessageInlineThinkingExpanded: (messageId, expanded) =>
    set((state) => {
      const prev = state.messageInlineThinkingExpanded[messageId] ?? false;
      if (prev === expanded) return state;
      return {
        messageInlineThinkingExpanded: {
          ...state.messageInlineThinkingExpanded,
          [messageId]: expanded,
        },
      };
    }),
  setMessageInlineToolsExpanded: (messageId, expanded) =>
    set((state) => {
      const prev = state.messageInlineToolsExpanded[messageId] ?? false;
      if (prev === expanded) return state;
      return {
        messageInlineToolsExpanded: {
          ...state.messageInlineToolsExpanded,
          [messageId]: expanded,
        },
      };
    }),
  setToolCallGroupExpanded: (groupId, expanded) =>
    set((state) => {
      const prev = state.toolCallGroupsExpanded[groupId] ?? false;
      if (prev === expanded) return state;
      return {
        toolCallGroupsExpanded: {
          ...state.toolCallGroupsExpanded,
          [groupId]: expanded,
        },
      };
    }),

  // Artifacts
  updateArtifactViewerState: (artifactId, updater) =>
    set((state) => {
      const prev = state.artifactViewerState[artifactId] ?? DEFAULT_ARTIFACT_VIEWER_ENTRY;
      const next = updater(prev);
      if (next === prev) return state;
      if (areArtifactViewerEntriesEqual(prev, next as typeof DEFAULT_ARTIFACT_VIEWER_ENTRY)) return state;
      return {
        artifactViewerState: {
          ...state.artifactViewerState,
          [artifactId]: next,
        },
      };
    }),

  // Code blocks & sandboxes
  updateCodeBlockState: (blockId, updater) =>
    set((state) => {
      const prev = state.codeBlockState[blockId] ?? DEFAULT_CODE_BLOCK_ENTRY;
      const next = updater(prev);
      if (next === prev) return state;
      if (areCodeBlockEntriesEqual(prev, next as typeof DEFAULT_CODE_BLOCK_ENTRY)) return state;
      return {
        codeBlockState: {
          ...state.codeBlockState,
          [blockId]: next,
        },
      };
    }),
  deleteCodeBlockState: (blockId) =>
    set((state) => {
      if (!(blockId in state.codeBlockState)) return state;
      const next = { ...state.codeBlockState };
      delete next[blockId];
      return { codeBlockState: next };
    }),
  setMermaidState: (id, svg, error) =>
    set((state) => {
      const prev = state.mermaidState[id];
      if (prev && prev.svg === svg && prev.error === error) return state;
      return {
        mermaidState: {
          ...state.mermaidState,
          [id]: { svg, error },
        },
      };
    }),
  deleteMermaidState: (id) =>
    set((state) => {
      if (!(id in state.mermaidState)) return state;
      const next = { ...state.mermaidState };
      delete next[id];
      return { mermaidState: next };
    }),

  // Splash
  setSplashIsMobile: (splashIsMobile) =>
    set((state) => (state.splashIsMobile === splashIsMobile ? state : { splashIsMobile })),

  // Agent mode
  setAgentMode: (enabled) => set({ agentMode: enabled }),
  setAgentPlan: (plan) => set({ agentPlan: plan }),
  setAgentFiles: (files) => set({ agentFiles: files }),
  setAgentFilesLoading: (loading) => set({ agentFilesLoading: loading }),
  setSelectedAgentFilePath: (path) => set({ selectedAgentFilePath: path }),
  setSelectedAgentFileContent: (content) => set({ selectedAgentFileContent: content }),
  setSelectedAgentFileLoading: (loading) => set({ selectedAgentFileLoading: loading }),
  addAgentFileVersion: (path, content) =>
    set((state) => {
      const existing = state.agentFileVersions[path] ?? [];
      const last = existing[existing.length - 1];
      if (last?.content === content) return state;
      const nextVersion = (last?.version ?? 0) + 1;
      const nextEntry: AgentFileVersion = {
        version: nextVersion,
        content,
        timestamp: Date.now(),
      };
      return {
        agentFileVersions: {
          ...state.agentFileVersions,
          [path]: [...existing, nextEntry],
        },
      };
    }),
  hydrateAgentFileVersions: (path, versions) =>
    set((state) => {
      if (!path) return state;
      const incoming = Array.isArray(versions) ? versions : [];
      const existing = state.agentFileVersions[path] ?? [];
      if (incoming.length === 0) return state;
      const lastIncoming = incoming[incoming.length - 1];
      const lastExisting = existing[existing.length - 1];
      if (
        existing.length === incoming.length &&
        lastExisting?.version === lastIncoming?.version &&
        lastExisting?.timestamp === lastIncoming?.timestamp &&
        lastExisting?.content === lastIncoming?.content
      ) {
        return state;
      }
      return {
        agentFileVersions: {
          ...state.agentFileVersions,
          [path]: incoming,
        },
      };
    }),
  moveAgentFileVersions: (from, to) =>
    set((state) => {
      if (from === to) return state;
      const existing = state.agentFileVersions[from];
      if (!existing) return state;
      const next = { ...state.agentFileVersions };
      delete next[from];
      next[to] = existing;
      return { agentFileVersions: next };
    }),
  clearAgentFileVersions: () => set({ agentFileVersions: {} }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setResultsLastTab: (tab) => set({ resultsLastTab: tab }),
  setMobilePlanChipHidden: (hidden) => set({ mobilePlanChipHidden: hidden }),

  pushToast: (toast) =>
    set((state) => {
      const dedupeKey = toast.dedupeKey?.trim();
      if (dedupeKey) {
        const existing = state.toasts.find((t) => t.dedupeKey === dedupeKey);
        if (existing) return state;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return {
        toasts: [
          {
            id,
            kind: toast.kind,
            title: toast.title,
            message: toast.message,
            detail: toast.detail,
            createdAt: Date.now(),
            expanded: false,
            dedupeKey: dedupeKey || undefined,
          },
          ...state.toasts,
        ].slice(0, 8),
      };
    }),
  closeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  toggleToastExpanded: (id) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)),
    })),
});
