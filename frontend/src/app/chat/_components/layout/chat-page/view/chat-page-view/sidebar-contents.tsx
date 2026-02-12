// CRITICAL
"use client";

import type { ReactNode } from "react";
import { PerfProfiler } from "../../../../perf/perf-profiler";
import { ActivityPanel, ContextPanel } from "../../../sidebar/chat-side-panel";
import { ArtifactPreviewPanel } from "../../../../artifacts/artifact-preview-panel";
import { AgentFilesPanel } from "../../../../agent/agent-files-panel";
import type { AgentFileEntry, AgentFileVersion, Artifact } from "@/lib/types";
import type { AgentPlan } from "../../../../agent/agent-types";
import type { ActivityGroup } from "../../../../../types";
import type { CompactionEvent, ContextStats } from "@/lib/services/context-management";

export type SidebarContentsVariant = "mobile" | "desktop";

export type SidebarContentsProps = {
  variant: SidebarContentsVariant;
  activityGroups: ActivityGroup[];
  agentPlan: AgentPlan | null;
  isLoading: boolean;

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
  compactionHistory: CompactionEvent[];
  compacting: boolean;
  compactionError: string | null;
  formatTokenCount: (tokens: number) => string;
  runManualCompaction: () => void;
  canManualCompact: boolean;

  sessionArtifacts: Artifact[];

  agentFiles: AgentFileEntry[];
  agentFileVersions: Record<string, AgentFileVersion[]>;
  selectedAgentFilePath: string | null;
  selectedAgentFileContent: string | null;
  selectedAgentFileLoading: boolean;
  onSelectAgentFile: (path: string | null) => void;
  hasSession: boolean;
};

export function buildSidebarContents(props: SidebarContentsProps): {
  activityContent: ReactNode;
  contextContent: ReactNode;
  artifactsContent: ReactNode;
  filesContent: ReactNode;
} {
  const prefix = props.variant === "mobile" ? "mobile-" : "";

  return {
    activityContent: (
      <div className="h-full flex flex-col">
        <PerfProfiler id={`${prefix}activity-panel`}>
          <ActivityPanel activityGroups={props.activityGroups} agentPlan={props.agentPlan} isLoading={props.isLoading} />
        </PerfProfiler>
      </div>
    ),
    contextContent: (
      <div className="p-4 overflow-y-auto h-full">
        <PerfProfiler id={`${prefix}context-panel`}>
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
    ),
    artifactsContent: (
      <PerfProfiler id={`${prefix}artifact-preview-panel`}>
        <ArtifactPreviewPanel artifacts={props.sessionArtifacts} />
      </PerfProfiler>
    ),
    filesContent: (
      <PerfProfiler id={`${prefix}agent-files-panel`}>
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
    ),
  };
}

