// CRITICAL
"use client";

import { memo, useCallback, type ReactNode, type RefObject } from "react";
import { PerfProfiler } from "../../perf/perf-profiler";
import { UnifiedSidebar, type SidebarTab } from "../unified-sidebar";
import { ActivityPanel, ContextPanel } from "../chat-side-panel";
import { ArtifactPreviewPanel } from "../../artifacts/artifact-preview-panel";
import { ChatConversation } from "../chat-conversation";
import { ChatTopControls } from "../chat-top-controls";
import { ChatActionButtons } from "../chat-action-buttons";
import { ChatToolbeltDock } from "../chat-toolbelt-dock";
import { ChatModals } from "../chat-modals";
import { MobileResultsDrawer } from "../mobile-results-drawer";
import { AgentFilesPanel } from "../../agent/agent-files-panel";
import { ArtifactModal } from "../../artifacts/artifact-modal";
import type {
  AgentFileEntry,
  AgentFileVersion,
  Artifact,
  ChatMessage,
  MCPServer,
  SessionUsage,
} from "@/lib/types";
import type { AgentPlan } from "../../agent/agent-types";
import type { ActivityGroup, ModelOption } from "../../../types";
import type { CompactionEvent, ContextStats } from "@/lib/services/context-management";
import type { DeepResearchConfig } from "@/lib/types";

export interface ChatPageViewProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  // Activity + context
  activityGroups: ActivityGroup[];
  activityCount: number;
  agentPlan: AgentPlan | null;
  thinkingActive: boolean;
  isLoading: boolean;
  streamError: string | null;
  streamStalled: boolean;
  thinkingSnippet: string;

  contextStats?: Omit<
    ContextStats,
    "compactionHistory" | "lastCompaction" | "totalCompactions" | "totalTokensCompacted"
  > | null;
  contextBreakdown?: {
    messages: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    userTokens: number;
    assistantTokens: number;
    thinkingTokens: number;
  } | null;
  contextUsageLabel: string | null;
  compactionHistory: CompactionEvent[];
  compacting: boolean;
  compactionError: string | null;
  formatTokenCount: (tokens: number) => string;
  runManualCompaction: () => void;
  canManualCompact: boolean;

  // Artifacts
  artifactsEnabled: boolean;
  sessionArtifacts: Artifact[];
  artifactsByMessage: Map<string, Artifact[]>;
  activeArtifact: Artifact | null;
  onCloseArtifactModal: () => void;

  // Agent files
  agentFiles: AgentFileEntry[];
  agentFileVersions: Record<string, AgentFileVersion[]>;
  selectedAgentFilePath: string | null;
  selectedAgentFileContent: string | null;
  selectedAgentFileLoading: boolean;
  onSelectAgentFile: (path: string | null) => void;
  hasSession: boolean;
  onOpenAgentFile: (path: string) => void;

  // Messages + list refs
  messages: ChatMessage[];
  selectedModel: string;
  showEmptyState: boolean;
  onForkMessage: (messageId: string) => void;
  onReprompt: (messageId: string) => void;
  openActivityPanel: () => void;
  openContextPanel: () => void;
  handleScroll: () => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;

  toolBelt: ReactNode;

  // Modals
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  mcpSettingsOpen: boolean;
  setMcpSettingsOpen: (open: boolean) => void;
  usageOpen: boolean;
  setUsageOpen: (open: boolean) => void;
  exportOpen: boolean;
  setExportOpen: (open: boolean) => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  setSelectedModel: (modelId: string) => void;
  availableModels: ModelOption[];
  deepResearch: DeepResearchConfig;
  setDeepResearch: (next: DeepResearchConfig) => void;
  mcpServers: MCPServer[];
  addMcpServer: (server: MCPServer) => Promise<void>;
  updateMcpServer: (server: MCPServer) => Promise<void>;
  removeMcpServer: (name: string) => Promise<void>;
  loadMCPServers: () => void | Promise<void>;
  sessionUsage: SessionUsage | null;
  onExportJson: () => void;
  onExportMarkdown: () => void;
}

export const ChatPageView = memo(function ChatPageView(props: ChatPageViewProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    setSettingsOpen,
    setMcpSettingsOpen,
    setUsageOpen,
    setExportOpen,
  } = props;

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  const handleOpenSidebarMobile = useCallback(() => {
    window.dispatchEvent(new CustomEvent("vllm:toggle-sidebar", { detail: { open: true } }));
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
  const closeSettings = useCallback(() => setSettingsOpen(false), [setSettingsOpen]);

  const openMcpSettings = useCallback(() => setMcpSettingsOpen(true), [setMcpSettingsOpen]);
  const closeMcpSettings = useCallback(
    () => setMcpSettingsOpen(false),
    [setMcpSettingsOpen],
  );

  const openUsage = useCallback(() => setUsageOpen(true), [setUsageOpen]);
  const closeUsage = useCallback(() => setUsageOpen(false), [setUsageOpen]);

  const openExport = useCallback(() => setExportOpen(true), [setExportOpen]);
  const closeExport = useCallback(() => setExportOpen(false), [setExportOpen]);

  return (
    <div className="relative h-full flex overflow-hidden w-full max-w-full bg-[#0a0a0a]">
      <MobileResultsDrawer
        isOpen={props.sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={props.sidebarTab}
        onSetActiveTab={props.setSidebarTab}
        hasArtifacts={props.sessionArtifacts.length > 0}
        activityContent={
          <div className="h-full flex flex-col">
            <PerfProfiler id="mobile-activity-panel">
              <ActivityPanel
                activityGroups={props.activityGroups}
                agentPlan={props.agentPlan}
                isLoading={props.isLoading}
              />
            </PerfProfiler>
          </div>
        }
        contextContent={
          <div className="p-4 overflow-y-auto h-full">
            <PerfProfiler id="mobile-context-panel">
              <ContextPanel
                stats={props.contextStats}
                breakdown={props.contextBreakdown}
                compactionHistory={props.compactionHistory}
                compacting={props.compacting}
                compactionError={props.compactionError}
                formatTokenCount={props.formatTokenCount}
                onCompact={props.runManualCompaction}
                canCompact={props.canManualCompact}
              />
            </PerfProfiler>
          </div>
        }
        artifactsContent={
          <PerfProfiler id="mobile-artifact-preview-panel">
            <ArtifactPreviewPanel artifacts={props.sessionArtifacts} />
          </PerfProfiler>
        }
        filesContent={
          <PerfProfiler id="mobile-agent-files-panel">
            <AgentFilesPanel
              files={props.agentFiles}
              plan={props.agentPlan}
              selectedFilePath={props.selectedAgentFilePath}
              selectedFileContent={props.selectedAgentFileContent}
              selectedFileLoading={props.selectedAgentFileLoading}
              fileVersions={props.agentFileVersions}
              onSelectFile={props.onSelectAgentFile}
              hasSession={props.hasSession}
            />
          </PerfProfiler>
        }
      />

      <UnifiedSidebar
        isOpen={props.sidebarOpen}
        onToggle={handleToggleSidebar}
        activeTab={props.sidebarTab}
        onSetActiveTab={props.setSidebarTab}
        hasArtifacts={props.sessionArtifacts.length > 0}
        activityContent={
          <div className="h-full flex flex-col">
            <PerfProfiler id="activity-panel">
              <ActivityPanel
                activityGroups={props.activityGroups}
                agentPlan={props.agentPlan}
                isLoading={props.isLoading}
              />
            </PerfProfiler>
          </div>
        }
        contextContent={
          <div className="p-4 overflow-y-auto h-full">
            <PerfProfiler id="context-panel">
              <ContextPanel
                stats={props.contextStats}
                breakdown={props.contextBreakdown}
                compactionHistory={props.compactionHistory}
                compacting={props.compacting}
                compactionError={props.compactionError}
                formatTokenCount={props.formatTokenCount}
                onCompact={props.runManualCompaction}
                canCompact={props.canManualCompact}
              />
            </PerfProfiler>
          </div>
        }
        artifactsContent={
          <PerfProfiler id="artifact-preview-panel">
            <ArtifactPreviewPanel artifacts={props.sessionArtifacts} />
          </PerfProfiler>
        }
        filesContent={
          <PerfProfiler id="agent-files-panel">
            <AgentFilesPanel
              files={props.agentFiles}
              plan={props.agentPlan}
              selectedFilePath={props.selectedAgentFilePath}
              selectedFileContent={props.selectedAgentFileContent}
              selectedFileLoading={props.selectedAgentFileLoading}
              fileVersions={props.agentFileVersions}
              onSelectFile={props.onSelectAgentFile}
              hasSession={props.hasSession}
            />
          </PerfProfiler>
        }
        width={props.sidebarWidth}
        onWidthChange={props.setSidebarWidth}
      >
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
          <div className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-[hsl(30,5%,10.5%)]">
            <ChatConversation
              messages={props.messages}
              isLoading={props.isLoading}
              thinkingSnippet={props.thinkingSnippet}
              artifactsEnabled={props.artifactsEnabled}
              artifactsByMessage={props.artifactsByMessage}
              selectedModel={props.selectedModel}
              contextUsageLabel={props.contextUsageLabel}
              agentFiles={props.agentFiles}
              selectedAgentFilePath={props.selectedAgentFilePath}
              onOpenAgentFile={props.onOpenAgentFile}
              onFork={props.onForkMessage}
              onReprompt={props.onReprompt}
              onOpenContext={props.openContextPanel}
              showEmptyState={props.showEmptyState}
              toolBelt={props.toolBelt}
              onScroll={props.handleScroll}
              messagesContainerRef={props.messagesContainerRef}
              messagesEndRef={props.messagesEndRef}
            />

            <ChatTopControls
              onOpenSidebar={handleOpenSidebarMobile}
              onOpenSettings={openSettings}
            />

            <ChatActionButtons
              activityCount={props.activityCount}
              onOpenActivity={props.openActivityPanel}
              onOpenContext={props.openContextPanel}
              onOpenSettings={openSettings}
              onOpenMcpSettings={openMcpSettings}
              onOpenUsage={openUsage}
              onOpenExport={openExport}
            />

            <ChatToolbeltDock toolBelt={props.toolBelt} showEmptyState={props.showEmptyState} />
          </div>
        </div>
      </UnifiedSidebar>

      <ChatModals
        settingsOpen={props.settingsOpen}
        onCloseSettings={closeSettings}
        mcpSettingsOpen={props.mcpSettingsOpen}
        onCloseMcpSettings={closeMcpSettings}
        usageOpen={props.usageOpen}
        onCloseUsage={closeUsage}
        exportOpen={props.exportOpen}
        onCloseExport={closeExport}
        systemPrompt={props.systemPrompt}
        onSystemPromptChange={props.setSystemPrompt}
        selectedModel={props.selectedModel}
        onSelectedModelChange={props.setSelectedModel}
        availableModels={props.availableModels}
        deepResearch={props.deepResearch}
        onDeepResearchChange={props.setDeepResearch}
        mcpServers={props.mcpServers}
        onAddServer={props.addMcpServer}
        onUpdateServer={props.updateMcpServer}
        onRemoveServer={props.removeMcpServer}
        onRefreshServers={props.loadMCPServers}
        sessionUsage={props.sessionUsage}
        messages={props.messages}
        onExportJson={props.onExportJson}
        onExportMarkdown={props.onExportMarkdown}
      />

      <ArtifactModal artifact={props.activeArtifact} onClose={props.onCloseArtifactModal} />
    </div>
  );
});
